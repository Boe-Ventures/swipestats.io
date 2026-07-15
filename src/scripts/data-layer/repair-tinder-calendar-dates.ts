import { sql, type SQL } from "drizzle-orm";

import { db, withTransaction, type TransactionClient } from "@/server/db";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

import {
  getFlagValue,
  hasFlag,
  printHeading,
  printJson,
  printRows,
} from "./utils";

type AuditRow = Record<string, unknown>;

function profileFilter(tinderId: string | null, alias: SQL): SQL {
  return tinderId ? sql`AND ${alias} = ${tinderId}` : sql``;
}

/** Inspect the legacy instant/calendar-date disagreement without writing. */
export async function auditTinderCalendarDates(
  tinderId: string | null,
): Promise<AuditRow> {
  const result = await db.execute<AuditRow>(sql`
    WITH selected_usage AS (
      SELECT
        usage.*,
        left(usage.date_stamp_raw, 10)::date::timestamp AS source_date,
        extract(
          year FROM age(
            left(usage.date_stamp_raw, 10)::date,
            profile.birth_date::date
          )
        )::int AS source_age
      FROM tinder_usage AS usage
      JOIN tinder_profile AS profile
        ON profile.tinder_id = usage.tinder_profile_id
      WHERE true
        ${profileFilter(tinderId, sql`usage.tinder_profile_id`)}
    ),
    source_bounds AS (
      SELECT
        tinder_profile_id,
        min(source_date) AS first_day,
        max(source_date) AS last_day
      FROM selected_usage
      GROUP BY tinder_profile_id
    )
    SELECT
      count(*)::bigint AS usage_rows,
      count(*) FILTER (
        WHERE usage.date_stamp IS DISTINCT FROM usage.source_date
      )::bigint AS shifted_usage_rows,
      count(DISTINCT usage.tinder_profile_id) FILTER (
        WHERE usage.date_stamp IS DISTINCT FROM usage.source_date
      )::int AS affected_profiles,
      count(*) FILTER (
        WHERE usage.user_age_this_day IS DISTINCT FROM usage.source_age
      )::bigint AS usage_age_mismatches,
      count(DISTINCT usage.tinder_profile_id) FILTER (
        WHERE usage.user_age_this_day IS DISTINCT FROM usage.source_age
      )::int AS profiles_with_usage_age_mismatch,
      count(DISTINCT bounds.tinder_profile_id) FILTER (
        WHERE profile.age_at_last_usage IS DISTINCT FROM extract(
          year FROM age(bounds.last_day::date, profile.birth_date::date)
        )::int
      )::int AS profile_last_usage_age_mismatches,
      count(DISTINCT profile.tinder_id) FILTER (
        WHERE profile.birth_date::time <> time '00:00:00'
      )::int AS profiles_with_non_midnight_birth_time,
      count(DISTINCT bounds.tinder_profile_id) FILTER (
        WHERE profile.first_day_on_app IS DISTINCT FROM bounds.first_day
           OR profile.last_day_on_app IS DISTINCT FROM bounds.last_day
           OR profile.days_in_profile_period IS DISTINCT FROM
             (bounds.last_day::date - bounds.first_day::date) + 1
      )::int AS profile_range_mismatches,
      count(DISTINCT bounds.tinder_profile_id) FILTER (
        WHERE meta."from" IS DISTINCT FROM bounds.first_day
           OR meta."to" IS DISTINCT FROM bounds.last_day
           OR meta.days_in_period IS DISTINCT FROM
             (bounds.last_day::date - bounds.first_day::date) + 1
      )::int AS metadata_range_mismatches,
      count(DISTINCT bounds.tinder_profile_id) FILTER (
        WHERE meta.id IS NULL
      )::int AS missing_metadata
    FROM selected_usage AS usage
    JOIN source_bounds AS bounds
      ON bounds.tinder_profile_id = usage.tinder_profile_id
    JOIN tinder_profile AS profile
      ON profile.tinder_id = bounds.tinder_profile_id
    LEFT JOIN profile_meta AS meta
      ON meta.tinder_profile_id = bounds.tinder_profile_id
     AND meta.hinge_profile_id IS NULL
  `);
  return result.rows[0] ?? {};
}

/**
 * Repair Tinder's stored timestamp column from its provider calendar key.
 *
 * REVIEW(provider assumption): Tinder Usage object keys represent calendar-day
 * buckets. We preserve that date verbatim at midnight and do not reinterpret
 * it through the uploader's browser timezone.
 */
export async function applyTinderCalendarDateRepair(
  tx: TransactionClient,
  tinderId: string | null,
): Promise<void> {
  // This maintenance repair must exclude uploads and SwipeRank builds while its
  // three source/aggregate statements observe one provider generation.
  await tx.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${swipeRankBuildLockName("TINDER")}, 0)
    )
  `);
  const usageRepair = await tx.execute<{ changed_rows: number | string }>(sql`
    WITH canonical AS (
      SELECT
        usage.tinder_profile_id,
        usage.date_stamp_raw,
        left(usage.date_stamp_raw, 10)::date::timestamp AS source_date,
        extract(
          year FROM age(
            left(usage.date_stamp_raw, 10)::date,
            profile.birth_date::date
          )
        )::int AS source_age
      FROM tinder_usage AS usage
      JOIN tinder_profile AS profile
        ON profile.tinder_id = usage.tinder_profile_id
      WHERE true
        ${profileFilter(tinderId, sql`usage.tinder_profile_id`)}
    ),
    updated AS (
      UPDATE tinder_usage AS usage
      SET
        date_stamp = canonical.source_date,
        user_age_this_day = canonical.source_age
      FROM canonical
      WHERE usage.tinder_profile_id = canonical.tinder_profile_id
        AND usage.date_stamp_raw = canonical.date_stamp_raw
        AND ROW(usage.date_stamp, usage.user_age_this_day)
          IS DISTINCT FROM ROW(canonical.source_date, canonical.source_age)
      RETURNING 1
    )
    SELECT count(*)::int AS changed_rows FROM updated
  `);

  const profileRepair = await tx.execute<{ changed_rows: number | string }>(sql`
    WITH bounds AS (
      SELECT
        usage.tinder_profile_id,
        min(left(usage.date_stamp_raw, 10)::date)::timestamp AS first_day,
        max(left(usage.date_stamp_raw, 10)::date)::timestamp AS last_day
      FROM tinder_usage AS usage
      WHERE true
        ${profileFilter(tinderId, sql`usage.tinder_profile_id`)}
      GROUP BY usage.tinder_profile_id
    ),
    updated AS (
      UPDATE tinder_profile AS profile
      SET
        first_day_on_app = bounds.first_day,
        last_day_on_app = bounds.last_day,
        days_in_profile_period =
          (bounds.last_day::date - bounds.first_day::date) + 1,
        age_at_last_usage = extract(
          year FROM age(bounds.last_day::date, profile.birth_date::date)
        )::int,
        updated_at = now()
      FROM bounds
      WHERE profile.tinder_id = bounds.tinder_profile_id
        AND ROW(
          profile.first_day_on_app,
          profile.last_day_on_app,
          profile.days_in_profile_period,
          profile.age_at_last_usage
        ) IS DISTINCT FROM ROW(
          bounds.first_day,
          bounds.last_day,
          (bounds.last_day::date - bounds.first_day::date) + 1,
          extract(
            year FROM age(bounds.last_day::date, profile.birth_date::date)
          )::int
        )
      RETURNING 1
    )
    SELECT count(*)::int AS changed_rows FROM updated
  `);

  const metadataRepair = await tx.execute<{
    changed_rows: number | string;
  }>(sql`
    WITH aggregate AS (
      SELECT
        usage.tinder_profile_id,
        min(left(usage.date_stamp_raw, 10)::date)::timestamp AS first_day,
        max(left(usage.date_stamp_raw, 10)::date)::timestamp AS last_day,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        coalesce(sum(usage.swipe_likes), 0)::int AS likes,
        coalesce(sum(usage.swipe_passes), 0)::int AS passes,
        coalesce(sum(usage.matches), 0)::int AS matches,
        coalesce(sum(usage.messages_sent), 0)::int AS messages_sent,
        coalesce(sum(usage.messages_received), 0)::int AS messages_received,
        coalesce(sum(usage.app_opens), 0)::int AS app_opens
      FROM tinder_usage AS usage
      WHERE true
        ${profileFilter(tinderId, sql`usage.tinder_profile_id`)}
      GROUP BY usage.tinder_profile_id
    ),
    updated AS (
      UPDATE profile_meta AS meta
      SET
        "from" = aggregate.first_day,
        "to" = aggregate.last_day,
        days_in_period =
          (aggregate.last_day::date - aggregate.first_day::date) + 1,
        days_active = aggregate.active_days,
        swipe_likes_total = aggregate.likes,
        swipe_passes_total = aggregate.passes,
        matches_total = aggregate.matches,
        messages_sent_total = aggregate.messages_sent,
        messages_received_total = aggregate.messages_received,
        app_opens_total = aggregate.app_opens,
        like_rate = CASE
          WHEN aggregate.likes + aggregate.passes > 0
            THEN aggregate.likes::double precision /
              (aggregate.likes + aggregate.passes)
          ELSE 0
        END,
        match_rate = CASE
          WHEN aggregate.likes > 0
            THEN aggregate.matches::double precision / aggregate.likes
          ELSE 0
        END,
        swipes_per_day = CASE
          WHEN aggregate.active_days > 0
            THEN (aggregate.likes + aggregate.passes)::double precision /
              aggregate.active_days
          ELSE 0
        END,
        computed_at = now()
      FROM aggregate
      WHERE meta.tinder_profile_id = aggregate.tinder_profile_id
        AND meta.hinge_profile_id IS NULL
        AND ROW(
          meta."from",
          meta."to",
          meta.days_in_period,
          meta.days_active,
          meta.swipe_likes_total,
          meta.swipe_passes_total,
          meta.matches_total,
          meta.messages_sent_total,
          meta.messages_received_total,
          meta.app_opens_total,
          meta.like_rate,
          meta.match_rate,
          meta.swipes_per_day
        ) IS DISTINCT FROM ROW(
          aggregate.first_day,
          aggregate.last_day,
          (aggregate.last_day::date - aggregate.first_day::date) + 1,
          aggregate.active_days,
          aggregate.likes,
          aggregate.passes,
          aggregate.matches,
          aggregate.messages_sent,
          aggregate.messages_received,
          aggregate.app_opens,
          CASE
            WHEN aggregate.likes + aggregate.passes > 0
              THEN aggregate.likes::double precision /
                (aggregate.likes + aggregate.passes)
            ELSE 0
          END,
          CASE
            WHEN aggregate.likes > 0
              THEN aggregate.matches::double precision / aggregate.likes
            ELSE 0
          END,
          CASE
            WHEN aggregate.active_days > 0
              THEN (aggregate.likes + aggregate.passes)::double precision /
                aggregate.active_days
            ELSE 0
          END
        )
      RETURNING 1
    )
    SELECT count(*)::int AS changed_rows FROM updated
  `);

  const changedRows = [usageRepair, profileRepair, metadataRepair].reduce(
    (sum, result) => sum + Number(result.rows[0]?.changed_rows ?? 0),
    0,
  );
  await tx.execute(sql`
    INSERT INTO swipe_rank_source_mutation (data_provider, created_at)
    SELECT 'TINDER', now()
    WHERE ${changedRows} > 0
  `);

  const postcondition = await tx.execute<{
    usage_mismatches: number | string;
    profile_mismatches: number | string;
    missing_meta: number | string;
    metadata_mismatches: number | string;
  }>(sql`
    WITH selected_usage AS (
      SELECT
        usage.*,
        left(usage.date_stamp_raw, 10)::date::timestamp AS source_date,
        extract(
          year FROM age(
            left(usage.date_stamp_raw, 10)::date,
            profile.birth_date::date
          )
        )::int AS source_age
      FROM tinder_usage AS usage
      JOIN tinder_profile AS profile
        ON profile.tinder_id = usage.tinder_profile_id
      WHERE true
        ${profileFilter(tinderId, sql`usage.tinder_profile_id`)}
    ),
    aggregate AS (
      SELECT
        usage.tinder_profile_id,
        min(usage.source_date) AS first_day,
        max(usage.source_date) AS last_day,
        count(*) FILTER (
          WHERE usage.swipe_likes > 0 OR usage.swipe_passes > 0
        )::int AS active_days,
        coalesce(sum(usage.swipe_likes), 0)::int AS likes,
        coalesce(sum(usage.swipe_passes), 0)::int AS passes,
        coalesce(sum(usage.matches), 0)::int AS matches,
        coalesce(sum(usage.messages_sent), 0)::int AS messages_sent,
        coalesce(sum(usage.messages_received), 0)::int AS messages_received,
        coalesce(sum(usage.app_opens), 0)::int AS app_opens
      FROM selected_usage AS usage
      GROUP BY usage.tinder_profile_id
    )
    SELECT
      (
        SELECT count(*)::int
        FROM selected_usage AS usage
        WHERE ROW(usage.date_stamp, usage.user_age_this_day)
          IS DISTINCT FROM ROW(usage.source_date, usage.source_age)
      ) AS usage_mismatches,
      count(*) FILTER (
        WHERE ROW(
          profile.first_day_on_app,
          profile.last_day_on_app,
          profile.days_in_profile_period,
          profile.age_at_last_usage
        ) IS DISTINCT FROM ROW(
          aggregate.first_day,
          aggregate.last_day,
          (aggregate.last_day::date - aggregate.first_day::date) + 1,
          extract(
            year FROM age(
              aggregate.last_day::date,
              profile.birth_date::date
            )
          )::int
        )
      )::int AS profile_mismatches,
      count(*) FILTER (WHERE meta.id IS NULL)::int AS missing_meta,
      count(*) FILTER (
        WHERE meta.id IS NOT NULL
          AND ROW(
            meta."from",
            meta."to",
            meta.days_in_period,
            meta.days_active,
            meta.swipe_likes_total,
            meta.swipe_passes_total,
            meta.matches_total,
            meta.messages_sent_total,
            meta.messages_received_total,
            meta.app_opens_total,
            meta.like_rate,
            meta.match_rate,
            meta.swipes_per_day
          ) IS DISTINCT FROM ROW(
            aggregate.first_day,
            aggregate.last_day,
            (aggregate.last_day::date - aggregate.first_day::date) + 1,
            aggregate.active_days,
            aggregate.likes,
            aggregate.passes,
            aggregate.matches,
            aggregate.messages_sent,
            aggregate.messages_received,
            aggregate.app_opens,
            CASE
              WHEN aggregate.likes + aggregate.passes > 0
                THEN aggregate.likes::double precision /
                  (aggregate.likes + aggregate.passes)
              ELSE 0
            END,
            CASE
              WHEN aggregate.likes > 0
                THEN aggregate.matches::double precision / aggregate.likes
              ELSE 0
            END,
            CASE
              WHEN aggregate.active_days > 0
                THEN (aggregate.likes + aggregate.passes)::double precision /
                  aggregate.active_days
              ELSE 0
            END
          )
      )::int AS metadata_mismatches
    FROM aggregate
    JOIN tinder_profile AS profile
      ON profile.tinder_id = aggregate.tinder_profile_id
    LEFT JOIN profile_meta AS meta
      ON meta.tinder_profile_id = aggregate.tinder_profile_id
     AND meta.hinge_profile_id IS NULL
  `);
  const failures = {
    usage_mismatches: Number(postcondition.rows[0]?.usage_mismatches ?? 0),
    profile_mismatches: Number(postcondition.rows[0]?.profile_mismatches ?? 0),
    missing_meta: Number(postcondition.rows[0]?.missing_meta ?? 0),
    metadata_mismatches: Number(
      postcondition.rows[0]?.metadata_mismatches ?? 0,
    ),
  };
  if (Object.values(failures).some((count) => count > 0)) {
    throw new Error(
      `Tinder calendar repair postcondition failed: ${Object.entries(failures)
        .map(([name, count]) => `${name}=${count}`)
        .join(", ")}`,
    );
  }
}

async function main(): Promise<void> {
  const tinderId = getFlagValue("--tinder-id");
  const shouldApply = hasFlag("--apply");
  const before = await auditTinderCalendarDates(tinderId);

  if (shouldApply) {
    await withTransaction((tx) => applyTinderCalendarDateRepair(tx, tinderId));
  }

  const after = shouldApply ? await auditTinderCalendarDates(tinderId) : null;
  const output = {
    mode: shouldApply ? "applied" : "dry-run",
    tinderId,
    before,
    after,
    note: "The raw provider date prefix is authoritative. Apply mode changes SwipeRank age and profile-range inputs. Immediately run `bun run swipe-rank:launch -- --confirm-write` against the same database before treating SwipeRank as fresh.",
  };

  if (hasFlag("--json")) {
    printJson(output);
    return;
  }

  printHeading("Tinder calendar-date repair");
  printRows([
    ["Mode", output.mode],
    ["Profile", tinderId ?? "all real Tinder profiles"],
    ["Usage rows", before.usage_rows ?? 0],
    ["Shifted rows before", before.shifted_usage_rows ?? 0],
    ["Affected profiles before", before.affected_profiles ?? 0],
    ["Usage age mismatches before", before.usage_age_mismatches ?? 0],
    [
      "Profiles with usage age mismatch before",
      before.profiles_with_usage_age_mismatch ?? 0,
    ],
    ["Shifted rows after", after?.shifted_usage_rows ?? "not applied"],
    [
      "Usage age mismatches after",
      after?.usage_age_mismatches ?? "not applied",
    ],
    [
      "Profile range mismatches after",
      after?.profile_range_mismatches ?? "not applied",
    ],
    [
      "Metadata range mismatches after",
      after?.metadata_range_mismatches ?? "not applied",
    ],
    ["Missing metadata after", after?.missing_metadata ?? "not applied"],
  ]);
  console.log(`\n${output.note}`);
  if (!shouldApply) {
    console.log("Pass --apply to run the transactional repair.");
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
