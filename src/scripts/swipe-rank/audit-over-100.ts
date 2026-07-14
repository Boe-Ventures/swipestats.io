import { sql, type SQL } from "drizzle-orm";

import { withTransaction, type TransactionClient } from "@/server/db";

type RawRow = Record<string, unknown>;

interface PopulationRow extends RawRow {
  tinder_id: string;
  gender: string;
  interested_in: string;
  first_usage: string | Date;
  last_usage: string | Date;
  usage_rows: number | string;
  active_days: number | string;
  likes: number | string;
  super_likes: number | string;
  passes: number | string;
  matches: number | string;
  messages_sent: number | string;
  messages_received: number | string;
}

interface DetailRow extends RawRow {
  tinder_id: string;
}

type Classification =
  | "SOURCE_INTEGRITY_ANOMALY"
  | "EXTREME_BUT_COHERENT_SOURCE_VALUES"
  | "LOW_VOLUME_SEMANTIC_MISMATCH"
  | "SEMANTIC_MISMATCH_NOT_CORRUPTION";

interface ProfileAudit {
  tinderId: string;
  shortId: string;
  gender: string;
  interestedIn: string;
  swipestatsVersion: string;
  observed: {
    firstUsage: string;
    lastUsage: string;
    usageRows: number;
    activeDays: number;
    monthsObserved: number;
  };
  metric: {
    ordinaryLikes: number;
    superLikes: number;
    positiveSwipes: number;
    passes: number;
    matches: number;
    ordinaryLikeYield: number;
    positiveSwipeYield: number;
    excessMatchesOverOrdinaryLikes: number;
  };
  dailyShape: {
    daysMatchesExceededOrdinaryLikes: number;
    daysWithMatchesAndZeroOrdinaryLikes: number;
    matchesOnZeroOrdinaryLikeDays: number;
    topMatchDayShare: number;
    topMatchMonthShare: number;
    monthsOverOne: number;
    firstMonthOverOne: string | null;
    lastMonthOverOne: string | null;
    topDays: unknown[];
  };
  integrity: {
    negativeUsageRows: number;
    combinedSwipeMismatches: number;
    storedDailyRateMismatches: number;
    duplicateCalendarDates: number;
    impossibleAgeRows: number;
    ageRegressions: number;
    usageRowsOutsideProfileRange: number;
    likesOutsideProfileRange: number;
    matchesOutsideProfileRange: number;
  };
  conversationEvidence: {
    rawMessagesSent: number;
    rawMessagesReceived: number;
    conversationRows: number;
    conversationsWithMessages: number;
    actualMessageRows: number;
    actualRowsMinusRawSent: number;
    cachedMessageRows: number;
    cachedMessageCountMismatches: number;
    duplicateSourceMatchIds: number;
    duplicateMessageSignatures: number;
    messageProfileMismatches: number;
    conversationCoverageOfRawMatches: number;
  };
  ingestionEvidence: {
    uploadRecords: number;
    firstUploadAt: string | null;
    lastUploadAt: string | null;
    profileMetaMatches: number | null;
    profileMetaLikes: number | null;
    profileMetaRate: number | null;
  };
  classification: {
    primary: Classification;
    confidence: "HIGH" | "MEDIUM";
    flags: string[];
    reasons: string[];
  };
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function number(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function date(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function nullableDate(value: unknown): string | null {
  return value === null || value === undefined ? null : date(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const position = (ordered.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const low = ordered[lower];
  const high = ordered[upper];
  if (low === undefined || high === undefined) return null;
  return low + (high - low) * (position - lower);
}

async function rows<T extends RawRow>(
  tx: TransactionClient,
  query: SQL,
): Promise<T[]> {
  const result = await tx.execute<T>(query);
  return result.rows as T[];
}

async function getPopulation(tx: TransactionClient): Promise<PopulationRow[]> {
  return rows<PopulationRow>(
    tx,
    sql`
      SELECT
        p.tinder_id,
        p.gender::text AS gender,
        p.interested_in::text AS interested_in,
        min(u.date_stamp_raw) AS first_usage,
        max(u.date_stamp_raw) AS last_usage,
        count(*)::int AS usage_rows,
        count(*) FILTER (
          WHERE u.swipe_likes > 0 OR u.swipe_passes > 0
        )::int AS active_days,
        sum(u.swipe_likes)::bigint AS likes,
        sum(u.swipe_super_likes)::bigint AS super_likes,
        sum(u.swipe_passes)::bigint AS passes,
        sum(u.matches)::bigint AS matches,
        sum(u.messages_sent)::bigint AS messages_sent,
        sum(u.messages_received)::bigint AS messages_received
      FROM tinder_profile p
      JOIN tinder_usage u ON u.tinder_profile_id = p.tinder_id
      WHERE p.computed = false
      GROUP BY p.tinder_id, p.gender, p.interested_in
    `,
  );
}

async function getDetails(
  tx: TransactionClient,
  tinderIds: string[],
): Promise<DetailRow[]> {
  if (tinderIds.length === 0) return [];

  const values = tinderIds.map((id) => sql`(${id}::text)`);

  return rows<DetailRow>(
    tx,
    sql`
      WITH suspects (tinder_id) AS (
        VALUES ${sql.join(values, sql`, `)}
      ),
      usage_windowed AS (
        SELECT
          u.*,
          p.first_day_on_app,
          p.last_day_on_app,
          min(u.date_stamp) OVER (
            PARTITION BY u.tinder_profile_id
          ) AS first_usage,
          lag(u.user_age_this_day) OVER (
            PARTITION BY u.tinder_profile_id
            ORDER BY u.date_stamp_raw
          ) AS previous_age
        FROM tinder_usage u
        JOIN suspects s ON s.tinder_id = u.tinder_profile_id
        JOIN tinder_profile p ON p.tinder_id = u.tinder_profile_id
      ),
      usage_agg AS (
        SELECT
          tinder_profile_id,
          min(date_stamp_raw) AS first_usage,
          max(date_stamp_raw) AS last_usage,
          count(*)::int AS usage_rows,
          count(DISTINCT date_stamp_raw)::int AS calendar_dates,
          count(*) FILTER (
            WHERE swipe_likes > 0 OR swipe_passes > 0
          )::int AS active_days,
          sum(swipe_likes)::bigint AS likes,
          sum(swipe_super_likes)::bigint AS super_likes,
          sum(swipe_passes)::bigint AS passes,
          sum(matches)::bigint AS matches,
          sum(messages_sent)::bigint AS messages_sent,
          sum(messages_received)::bigint AS messages_received,
          count(*) FILTER (WHERE matches > swipe_likes)::int
            AS days_matches_over_likes,
          count(*) FILTER (
            WHERE matches > 0 AND swipe_likes = 0
          )::int AS match_zero_like_days,
          coalesce(sum(matches) FILTER (
            WHERE matches > 0 AND swipe_likes = 0
          ), 0)::bigint AS matches_on_zero_like_days,
          max(matches)::int AS max_day_matches,
          max(swipe_likes)::int AS max_day_likes,
          count(*) FILTER (
            WHERE app_opens < 0
               OR matches < 0
               OR swipe_likes < 0
               OR swipe_super_likes < 0
               OR swipe_passes < 0
               OR messages_sent < 0
               OR messages_received < 0
          )::int AS negative_usage_rows,
          count(*) FILTER (
            WHERE swipes_combined <> swipe_likes + swipe_passes
          )::int AS combined_swipe_mismatches,
          count(*) FILTER (
            WHERE abs(
              match_rate - CASE
                WHEN swipe_likes > 0 THEN matches::double precision / swipe_likes
                ELSE 0
              END
            ) > 1e-12
          )::int AS stored_daily_rate_mismatches,
          count(*) FILTER (
            WHERE user_age_this_day < 18 OR user_age_this_day > 100
          )::int AS impossible_age_rows,
          count(*) FILTER (
            WHERE previous_age IS NOT NULL
              AND user_age_this_day < previous_age
          )::int AS age_regressions,
          count(*) FILTER (
            WHERE date_stamp < first_day_on_app
               OR date_stamp > last_day_on_app
          )::int AS outside_profile_range_rows,
          coalesce(sum(swipe_likes) FILTER (
            WHERE date_stamp < first_day_on_app
               OR date_stamp > last_day_on_app
          ), 0)::bigint AS outside_profile_range_likes,
          coalesce(sum(matches) FILTER (
            WHERE date_stamp < first_day_on_app
               OR date_stamp > last_day_on_app
          ), 0)::bigint AS outside_profile_range_matches
        FROM usage_windowed
        GROUP BY tinder_profile_id
      ),
      monthly AS (
        SELECT
          u.tinder_profile_id,
          date_trunc('month', u.date_stamp_raw::date)::date AS month,
          sum(u.swipe_likes)::bigint AS likes,
          sum(u.swipe_super_likes)::bigint AS super_likes,
          sum(u.matches)::bigint AS matches
        FROM tinder_usage u
        JOIN suspects s ON s.tinder_id = u.tinder_profile_id
        GROUP BY
          u.tinder_profile_id,
          date_trunc('month', u.date_stamp_raw::date)::date
      ),
      monthly_agg AS (
        SELECT
          tinder_profile_id,
          count(*)::int AS months_observed,
          count(*) FILTER (
            WHERE matches > likes AND likes > 0
          )::int AS months_over_one,
          min(month) FILTER (
            WHERE matches > likes AND likes > 0
          ) AS first_month_over_one,
          max(month) FILTER (
            WHERE matches > likes AND likes > 0
          ) AS last_month_over_one,
          max(matches)::bigint AS top_month_matches
        FROM monthly
        GROUP BY tinder_profile_id
      ),
      ranked_days AS (
        SELECT
          u.tinder_profile_id,
          u.date_stamp_raw,
          u.swipe_likes,
          u.swipe_super_likes,
          u.swipe_passes,
          u.matches,
          u.messages_sent,
          u.messages_received,
          row_number() OVER (
            PARTITION BY u.tinder_profile_id
            ORDER BY u.matches DESC, u.date_stamp_raw
          ) AS position
        FROM tinder_usage u
        JOIN suspects s ON s.tinder_id = u.tinder_profile_id
      ),
      top_days AS (
        SELECT
          tinder_profile_id,
          jsonb_agg(
            jsonb_build_object(
              'date', date_stamp_raw,
              'ordinaryLikes', swipe_likes,
              'superLikes', swipe_super_likes,
              'passes', swipe_passes,
              'matches', matches,
              'messagesSent', messages_sent,
              'messagesReceived', messages_received
            ) ORDER BY position
          ) FILTER (WHERE position <= 3) AS top_days
        FROM ranked_days
        GROUP BY tinder_profile_id
      ),
      message_by_match AS (
        SELECT
          m.id AS match_id,
          m.tinder_profile_id,
          m.total_message_count,
          count(msg.id)::int AS actual_message_count,
          count(msg.id) FILTER (
            WHERE msg.tinder_profile_id IS DISTINCT FROM m.tinder_profile_id
          )::int AS profile_mismatches
        FROM match m
        JOIN suspects s ON s.tinder_id = m.tinder_profile_id
        LEFT JOIN message msg ON msg.match_id = m.id
        GROUP BY m.id, m.tinder_profile_id, m.total_message_count
      ),
      conversation_agg AS (
        SELECT
          tinder_profile_id,
          count(*)::int AS conversation_rows,
          count(*) FILTER (WHERE total_message_count > 0)::int
            AS conversations_with_messages,
          sum(actual_message_count)::bigint AS actual_message_rows,
          sum(total_message_count)::bigint AS cached_message_rows,
          count(*) FILTER (
            WHERE actual_message_count <> total_message_count
          )::int AS cached_message_count_mismatches,
          sum(profile_mismatches)::int AS message_profile_mismatches
        FROM message_by_match
        GROUP BY tinder_profile_id
      ),
      duplicate_source_match_ids AS (
        SELECT tinder_profile_id, coalesce(sum(row_count - 1), 0)::int AS excess
        FROM (
          SELECT
            m.tinder_profile_id,
            m.tinder_match_id,
            count(*)::int AS row_count
          FROM match m
          JOIN suspects s ON s.tinder_id = m.tinder_profile_id
          WHERE m.tinder_match_id IS NOT NULL
          GROUP BY m.tinder_profile_id, m.tinder_match_id
          HAVING count(*) > 1
        ) duplicate_groups
        GROUP BY tinder_profile_id
      ),
      duplicate_message_signatures AS (
        SELECT tinder_profile_id, coalesce(sum(row_count - 1), 0)::int AS excess
        FROM (
          SELECT
            msg.tinder_profile_id,
            msg.match_id,
            msg.sent_date_raw,
            msg.content_raw,
            msg."to",
            count(*)::int AS row_count
          FROM message msg
          JOIN suspects s ON s.tinder_id = msg.tinder_profile_id
          GROUP BY
            msg.tinder_profile_id,
            msg.match_id,
            msg.sent_date_raw,
            msg.content_raw,
            msg."to"
          HAVING count(*) > 1
        ) duplicate_groups
        GROUP BY tinder_profile_id
      ),
      source_files AS (
        SELECT
          p.tinder_id,
          count(f.id)::int AS upload_records,
          min(f.created_at) AS first_upload_at,
          max(f.created_at) AS last_upload_at
        FROM tinder_profile p
        JOIN suspects s ON s.tinder_id = p.tinder_id
        LEFT JOIN original_anonymized_file f
          ON f.user_id = p.user_id
         AND f.data_provider = 'TINDER'
        GROUP BY p.tinder_id
      )
      SELECT
        p.tinder_id,
        p.gender::text AS gender,
        p.interested_in::text AS interested_in,
        p.swipestats_version::text AS swipestats_version,
        ua.*,
        ma.months_observed,
        ma.months_over_one,
        ma.first_month_over_one,
        ma.last_month_over_one,
        ma.top_month_matches,
        td.top_days,
        coalesce(ca.conversation_rows, 0)::int AS conversation_rows,
        coalesce(ca.conversations_with_messages, 0)::int
          AS conversations_with_messages,
        coalesce(ca.actual_message_rows, 0)::bigint AS actual_message_rows,
        coalesce(ca.cached_message_rows, 0)::bigint AS cached_message_rows,
        coalesce(ca.cached_message_count_mismatches, 0)::int
          AS cached_message_count_mismatches,
        coalesce(ca.message_profile_mismatches, 0)::int
          AS message_profile_mismatches,
        coalesce(dsmi.excess, 0)::int AS duplicate_source_match_ids,
        coalesce(dms.excess, 0)::int AS duplicate_message_signatures,
        sf.upload_records,
        sf.first_upload_at,
        sf.last_upload_at,
        pm.swipe_likes_total AS meta_likes,
        pm.matches_total AS meta_matches,
        pm.match_rate AS meta_match_rate
      FROM suspects s
      JOIN tinder_profile p ON p.tinder_id = s.tinder_id
      JOIN usage_agg ua ON ua.tinder_profile_id = s.tinder_id
      JOIN monthly_agg ma ON ma.tinder_profile_id = s.tinder_id
      JOIN top_days td ON td.tinder_profile_id = s.tinder_id
      JOIN source_files sf ON sf.tinder_id = s.tinder_id
      LEFT JOIN conversation_agg ca ON ca.tinder_profile_id = s.tinder_id
      LEFT JOIN duplicate_source_match_ids dsmi
        ON dsmi.tinder_profile_id = s.tinder_id
      LEFT JOIN duplicate_message_signatures dms
        ON dms.tinder_profile_id = s.tinder_id
      LEFT JOIN profile_meta pm ON pm.tinder_profile_id = s.tinder_id
      ORDER BY ua.matches::numeric / nullif(ua.likes, 0) DESC
    `,
  );
}

async function getProfileMetaContext(tx: TransactionClient) {
  const result = await rows<RawRow>(
    tx,
    sql`
      SELECT
        count(*) FILTER (
          WHERE tinder_profile_id IS NOT NULL AND match_rate > 1
        )::int AS tinder_rows_over_one,
        count(*) FILTER (
          WHERE hinge_profile_id IS NOT NULL AND match_rate > 1
        )::int AS hinge_rows_over_one,
        count(*) FILTER (WHERE match_rate > 1)::int AS all_rows_over_one
      FROM profile_meta
    `,
  );
  const row = result[0];
  if (!row) throw new Error("profile_meta context query returned no row.");
  return {
    tinderRowsOverOne: number(row.tinder_rows_over_one),
    hingeRowsOverOne: number(row.hinge_rows_over_one),
    allRowsOverOne: number(row.all_rows_over_one),
  };
}

function classifyProfile(row: DetailRow): ProfileAudit {
  const likes = number(row.likes);
  const superLikes = number(row.super_likes);
  const positiveSwipes = likes + superLikes;
  const matches = number(row.matches);
  const usageRows = number(row.usage_rows);
  const duplicateCalendarDates = usageRows - number(row.calendar_dates);
  const topMatchDayShare = ratio(number(row.max_day_matches), matches);
  const topMatchMonthShare = ratio(number(row.top_month_matches), matches);

  const integrityFailures =
    number(row.negative_usage_rows) +
    number(row.combined_swipe_mismatches) +
    number(row.stored_daily_rate_mismatches) +
    duplicateCalendarDates +
    number(row.impossible_age_rows) +
    number(row.age_regressions);

  const flags: string[] = [];
  const reasons: string[] = [];

  if (likes < 100) flags.push("LOW_VOLUME_DENOMINATOR");
  if (matches / likes >= 2) flags.push("YIELD_AT_LEAST_200_PERCENT");
  if (matches / likes >= 5) flags.push("YIELD_AT_LEAST_500_PERCENT");
  if (topMatchDayShare >= 0.5) flags.push("SINGLE_DAY_CONCENTRATION");
  if (number(row.match_zero_like_days) > 0) {
    flags.push("MATCHES_ON_ZERO_ORDINARY_LIKE_DAYS");
  }
  if (number(row.outside_profile_range_rows) > 0) {
    flags.push("PROFILE_RANGE_EXCLUSIONS");
  }
  if (number(row.upload_records) > 1) flags.push("MULTIPLE_UPLOAD_RECORDS");
  if (number(row.duplicate_source_match_ids) > 0) {
    flags.push("DUPLICATE_SOURCE_MATCH_IDS");
  }
  if (number(row.duplicate_message_signatures) > 0) {
    flags.push("DUPLICATE_MESSAGE_SIGNATURES");
  }
  if (number(row.cached_message_count_mismatches) > 0) {
    flags.push("CACHED_MESSAGE_COUNT_MISMATCHES");
  }
  if (integrityFailures > 0) flags.push("USAGE_INTEGRITY_FAILURE");

  let primary: Classification;
  let confidence: "HIGH" | "MEDIUM";

  if (integrityFailures > 0) {
    primary = "SOURCE_INTEGRITY_ANOMALY";
    confidence = "HIGH";
    reasons.push(
      "At least one invariant in the persisted daily usage series failed.",
    );
  } else if (
    matches / likes >= 5 ||
    number(row.max_day_matches) >= 500 ||
    topMatchDayShare >= 0.75
  ) {
    primary = "EXTREME_BUT_COHERENT_SOURCE_VALUES";
    confidence = "MEDIUM";
    reasons.push(
      "The source values are extreme enough to merit inspecting the original export, but database-grain and arithmetic checks are coherent.",
    );
  } else if (likes < 100) {
    primary = "LOW_VOLUME_SEMANTIC_MISMATCH";
    confidence = "HIGH";
    reasons.push(
      "A small outbound-like denominator amplifies a numerator that is not constrained to same-day ordinary right swipes.",
    );
  } else {
    primary = "SEMANTIC_MISMATCH_NOT_CORRUPTION";
    confidence = "HIGH";
    reasons.push(
      "The match-event numerator is not a bounded conversion numerator for recorded ordinary outbound likes.",
    );
  }

  if (number(row.match_zero_like_days) > 0) {
    reasons.push(
      "Matches occur on days with zero ordinary right swipes, consistent with delayed or incoming-like acceptance semantics.",
    );
  }
  if (number(row.conversation_rows) <= matches) {
    reasons.push(
      "Retained conversation rows do not exceed the raw match-event total, which is directionally coherent.",
    );
  }
  if (superLikes > 0 && matches > positiveSwipes) {
    reasons.push(
      "Including Super Likes in the denominator does not bring the yield below 100%.",
    );
  }

  const topDays = Array.isArray(row.top_days) ? row.top_days : [];

  return {
    tinderId: row.tinder_id,
    shortId: row.tinder_id.slice(0, 12),
    gender: String(row.gender),
    interestedIn: String(row.interested_in),
    swipestatsVersion: String(row.swipestats_version),
    observed: {
      firstUsage: date(row.first_usage),
      lastUsage: date(row.last_usage),
      usageRows,
      activeDays: number(row.active_days),
      monthsObserved: number(row.months_observed),
    },
    metric: {
      ordinaryLikes: likes,
      superLikes,
      positiveSwipes,
      passes: number(row.passes),
      matches,
      ordinaryLikeYield: ratio(matches, likes),
      positiveSwipeYield: ratio(matches, positiveSwipes),
      excessMatchesOverOrdinaryLikes: matches - likes,
    },
    dailyShape: {
      daysMatchesExceededOrdinaryLikes: number(row.days_matches_over_likes),
      daysWithMatchesAndZeroOrdinaryLikes: number(row.match_zero_like_days),
      matchesOnZeroOrdinaryLikeDays: number(row.matches_on_zero_like_days),
      topMatchDayShare,
      topMatchMonthShare,
      monthsOverOne: number(row.months_over_one),
      firstMonthOverOne: nullableDate(row.first_month_over_one),
      lastMonthOverOne: nullableDate(row.last_month_over_one),
      topDays,
    },
    integrity: {
      negativeUsageRows: number(row.negative_usage_rows),
      combinedSwipeMismatches: number(row.combined_swipe_mismatches),
      storedDailyRateMismatches: number(row.stored_daily_rate_mismatches),
      duplicateCalendarDates,
      impossibleAgeRows: number(row.impossible_age_rows),
      ageRegressions: number(row.age_regressions),
      usageRowsOutsideProfileRange: number(row.outside_profile_range_rows),
      likesOutsideProfileRange: number(row.outside_profile_range_likes),
      matchesOutsideProfileRange: number(row.outside_profile_range_matches),
    },
    conversationEvidence: {
      rawMessagesSent: number(row.messages_sent),
      rawMessagesReceived: number(row.messages_received),
      conversationRows: number(row.conversation_rows),
      conversationsWithMessages: number(row.conversations_with_messages),
      actualMessageRows: number(row.actual_message_rows),
      actualRowsMinusRawSent:
        number(row.actual_message_rows) - number(row.messages_sent),
      cachedMessageRows: number(row.cached_message_rows),
      cachedMessageCountMismatches: number(row.cached_message_count_mismatches),
      duplicateSourceMatchIds: number(row.duplicate_source_match_ids),
      duplicateMessageSignatures: number(row.duplicate_message_signatures),
      messageProfileMismatches: number(row.message_profile_mismatches),
      conversationCoverageOfRawMatches: ratio(
        number(row.conversation_rows),
        matches,
      ),
    },
    ingestionEvidence: {
      uploadRecords: number(row.upload_records),
      firstUploadAt: nullableDate(row.first_upload_at),
      lastUploadAt: nullableDate(row.last_upload_at),
      profileMetaMatches: nullableNumber(row.meta_matches),
      profileMetaLikes: nullableNumber(row.meta_likes),
      profileMetaRate: nullableNumber(row.meta_match_rate),
    },
    classification: { primary, confidence, flags, reasons },
  };
}

function buildPopulationSummary(population: PopulationRow[]) {
  const normalized = population.map((row) => {
    const likes = number(row.likes);
    const superLikes = number(row.super_likes);
    const matches = number(row.matches);
    return {
      ...row,
      likes,
      superLikes,
      matches,
      activeDays: number(row.active_days),
      lastYear: Number(date(row.last_usage).slice(0, 4)),
      yield: likes > 0 ? matches / likes : null,
    };
  });

  const defined = normalized.filter((row) => row.likes > 0);
  const suspects = defined.filter((row) => row.matches > row.likes);
  const zeroDenominator = normalized.filter(
    (row) => row.likes === 0 && row.matches > 0,
  );
  const byGender = Object.fromEntries(
    [...new Set(suspects.map((row) => String(row.gender)))].map((gender) => [
      gender,
      suspects.filter((row) => row.gender === gender).length,
    ]),
  );
  const byLastUsageYear = Object.fromEntries(
    [...new Set(suspects.map((row) => row.lastYear))]
      .sort((a, b) => a - b)
      .map((year) => [
        String(year),
        suspects.filter((row) => row.lastYear === year).length,
      ]),
  );
  const yields = suspects
    .map((row) => row.yield)
    .filter((value): value is number => value !== null);

  return {
    realProfilesWithUsage: normalized.length,
    profilesWithDefinedOrdinaryLikeYield: defined.length,
    profilesOverOne: suspects.length,
    shareOfDefinedProfiles: ratio(suspects.length, defined.length),
    profilesWithMatchesAndZeroOrdinaryLikes: zeroDenominator.length,
    profilesStillOverOneIncludingSuperLikes: suspects.filter(
      (row) => row.matches > row.likes + row.superLikes,
    ).length,
    profilesOverOneBelow100OrdinaryLikes: suspects.filter(
      (row) => row.likes < 100,
    ).length,
    profilesOverOneAtLeast100LikesAnd5ActiveDays: suspects.filter(
      (row) => row.likes >= 100 && row.activeDays >= 5,
    ).length,
    profilesOverOneAtLeast1000LikesAnd40ActiveDays: suspects.filter(
      (row) => row.likes >= 1000 && row.activeDays >= 40,
    ).length,
    byGender,
    byLastUsageYear,
    yieldDistributionAmongOverOne: {
      minimum: yields.length ? Math.min(...yields) : null,
      median: percentile(yields, 0.5),
      p90: percentile(yields, 0.9),
      maximum: yields.length ? Math.max(...yields) : null,
    },
    suspectIds: suspects.map((row) => row.tinder_id),
  };
}

function printHuman(result: {
  asOf: string;
  profileMetaContext: Awaited<ReturnType<typeof getProfileMetaContext>>;
  population: ReturnType<typeof buildPopulationSummary>;
  profiles: ProfileAudit[];
  conclusions: string[];
  metricContractChanges: string[];
}) {
  console.log("\nTinder >100% match-yield audit");
  console.log("────────────────────────────────────────");
  console.log(`As of: ${result.asOf}`);
  console.log(
    `Defined ratios >100%: ${result.population.profilesOverOne} / ${result.population.profilesWithDefinedOrdinaryLikeYield}`,
  );
  console.log(
    `profile_meta >100%: ${result.profileMetaContext.allRowsOverOne} (${result.profileMetaContext.tinderRowsOverOne} Tinder + ${result.profileMetaContext.hingeRowsOverOne} Hinge)`,
  );
  console.log(
    `Zero-denominator profiles with matches: ${result.population.profilesWithMatchesAndZeroOrdinaryLikes}`,
  );
  console.log(
    `Still >100% after Super Likes: ${result.population.profilesStillOverOneIncludingSuperLikes}`,
  );
  console.log(
    `Under 100 ordinary likes: ${result.population.profilesOverOneBelow100OrdinaryLikes}`,
  );
  console.log(
    `V1 all-time eligible (1,000 likes / 40 active days): ${result.population.profilesOverOneAtLeast1000LikesAnd40ActiveDays}`,
  );
  console.log(
    `Gender: ${JSON.stringify(result.population.byGender)}; last usage year: ${JSON.stringify(result.population.byLastUsageYear)}`,
  );

  console.log("\nProfiles");
  console.log("────────");
  for (const profile of result.profiles) {
    console.log(
      [
        profile.shortId,
        profile.gender,
        `${profile.metric.matches}/${profile.metric.ordinaryLikes}`,
        `${(profile.metric.ordinaryLikeYield * 100).toFixed(1)}%`,
        profile.classification.primary,
        profile.classification.flags.join(",") || "none",
      ].join("  "),
    );
  }

  console.log("\nConclusions");
  console.log("───────────");
  result.conclusions.forEach((item) => console.log(`- ${item}`));

  console.log("\nMetric contract changes");
  console.log("───────────────────────");
  result.metricContractChanges.forEach((item) => console.log(`- ${item}`));
}

async function main() {
  const audit = await withTransaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);

    const population = await getPopulation(tx);
    const populationSummary = buildPopulationSummary(population);
    const details = await getDetails(tx, populationSummary.suspectIds);
    const profiles = details.map(classifyProfile);
    const profileMetaContext = await getProfileMetaContext(tx);

    const integrityAnomalies = profiles.filter(
      (profile) =>
        profile.classification.primary === "SOURCE_INTEGRITY_ANOMALY",
    ).length;
    const profileRangeCases = profiles.filter(
      (profile) => profile.integrity.usageRowsOutsideProfileRange > 0,
    ).length;
    const multiUploadCases = profiles.filter(
      (profile) => profile.ingestionEvidence.uploadRecords > 1,
    ).length;
    const duplicateCalendarCases = profiles.filter(
      (profile) => profile.integrity.duplicateCalendarDates > 0,
    ).length;
    const conversationOverflowCases = profiles.filter(
      (profile) =>
        profile.conversationEvidence.conversationRows > profile.metric.matches,
    ).length;
    const duplicateSourceMatchIdCases = profiles.filter(
      (profile) => profile.conversationEvidence.duplicateSourceMatchIds > 0,
    ).length;
    const duplicateMessageSignatureCases = profiles.filter(
      (profile) => profile.conversationEvidence.duplicateMessageSignatures > 0,
    ).length;
    const cachedMessageMismatchCases = profiles.filter(
      (profile) =>
        profile.conversationEvidence.cachedMessageCountMismatches > 0,
    ).length;
    const firstOverOneMonth = profiles
      .map((profile) => profile.dailyShape.firstMonthOverOne)
      .filter((month): month is string => month !== null)
      .sort()[0];

    return {
      asOf: new Date().toISOString(),
      profileMetaContext,
      auditedMetric: {
        numerator: "sum(tinder_usage.matches)",
        denominator: "sum(tinder_usage.swipe_likes)",
        grain: "one real, non-computed Tinder profile over all observed usage",
        threshold: "numerator / denominator > 1 with denominator > 0",
      },
      population: populationSummary,
      profiles,
      conclusions: [
        `${integrityAnomalies} of ${profiles.length} profiles fail persisted daily-usage arithmetic, sign, age-order, or calendar-grain checks.`,
        `${profileRangeCases} of ${profiles.length} are explained by usage outside tinder_profile.first_day_on_app/last_day_on_app.`,
        `${duplicateCalendarCases} of ${profiles.length} have duplicate normalized calendar days; the primary key already prevents duplicate raw-date rows.`,
        `${multiUploadCases} of ${profiles.length} have multiple recorded Tinder uploads; repeated exports upsert rather than add daily usage, so upload count alone is not duplication evidence.`,
        `${conversationOverflowCases} of ${profiles.length} have more retained conversation rows than raw match events. A count at or below raw matches is directionally coherent, although the two sources measure different things.`,
        `${duplicateSourceMatchIdCases} profiles have duplicate source match IDs, ${duplicateMessageSignatureCases} have any repeated message signature, and ${cachedMessageMismatchCases} have cached per-conversation message-count disagreement.`,
        `Among these profiles, the first month whose own yield exceeds 100% is ${firstOverOneMonth ?? "not observed"}; the temporal concentration is a source-semantics or product-behavior signal, not proof of corruption.`,
        "The anomaly is concentrated in recent profiles and mostly female profiles, which fits an undirected/incoming-or-delayed match numerator divided by ordinary outbound right swipes better than broad database corruption.",
      ],
      metricContractChanges: [
        "Rename the displayed measure from match rate to match yield (matches per recorded outbound positive action); do not describe it as a bounded probability.",
      "Retain numerator, ordinary likes, Super Likes, denominator definition, source coverage dates, and metric version on every fact and private/admin rank; public views may round the yield and omit raw totals.",
      "Keep ordinary right swipes as the published v1 denominator. If Super Likes should count as conversion opportunities, introduce that as a separately versioned positive-action metric; either yield may legitimately exceed one.",
        "Never cap values at 100%. If product semantics require a probability, exclude the metric until Tinder supplies outbound-attributed matches.",
        "Keep minimum-volume eligibility and peer cohorts for ranking, but do not treat eligibility as a data-validity repair.",
      ],
    };
  });

  if (hasFlag("--json")) {
    console.log(JSON.stringify(audit, null, 2));
  } else {
    printHuman(audit);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
