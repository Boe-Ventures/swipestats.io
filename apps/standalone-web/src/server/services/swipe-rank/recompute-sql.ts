import { sql, type SQL } from "drizzle-orm";

export function buildSwipeRankSourceWatermarkUpdate(input: {
  closedBefore: string;
  buildId: string;
}): SQL {
  return sql`
    WITH selected_profiles AS (
      SELECT
        p.tinder_id,
        p.updated_at,
        p.user_id
      FROM tinder_profile p
      WHERE p.computed = false
    ),
    usage_watermark AS (
      SELECT
        count(*)::bigint AS row_count,
        min(u.date_stamp_raw)::date AS first_date,
        max(u.date_stamp_raw)::date AS last_date
      FROM tinder_usage u
      JOIN selected_profiles p ON p.tinder_id = u.tinder_profile_id
    ),
    file_watermark AS (
      SELECT max(revision.accepted_at) AS latest_file_created_at
      FROM tinder_export_revision revision
      JOIN selected_profiles p
        ON p.tinder_id = revision.tinder_profile_id
    )
    UPDATE swipe_rank_build
    SET source_watermark = swipe_rank_build.source_watermark || jsonb_build_object(
      'closedBefore', ${input.closedBefore}::text,
      'profileCount', (SELECT count(*) FROM selected_profiles),
      'usageRowCount', coalesce((SELECT row_count FROM usage_watermark), 0),
      'firstObservedDate', (SELECT first_date FROM usage_watermark),
      'lastObservedDate', (SELECT last_date FROM usage_watermark),
      'latestProfileUpdatedAt', (SELECT max(updated_at) FROM selected_profiles),
      'latestSourceFileCreatedAt', (SELECT latest_file_created_at FROM file_watermark)
    )
    WHERE swipe_rank_build.id = ${input.buildId}
  `;
}
