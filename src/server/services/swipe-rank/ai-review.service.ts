import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { generateStructured } from "@/lib/ai/generate-structured";
import { db } from "@/server/db";
import { swipeRankProfileAiReviewTable } from "@/server/db/schema";

import {
  applySwipeRankAiReviewPolicy,
  buildSwipeRankAiReviewHoldReason,
  buildSwipeRankCohortComparison,
  buildSwipeRankMechanicalSignals,
  buildSwipeRankReviewPrompt,
  redactSwipeRankReviewMessage,
  SWIPE_RANK_AI_REVIEW_MODEL,
  SWIPE_RANK_AI_REVIEW_VERSION,
  shouldReuseSwipeRankProfileReview,
  swipeRankAiReviewRequiresHold,
  swipeRankAiReviewOutputSchema,
} from "./ai-review.contract";
import { setTinderSwipeRankExclusion } from "./exclusion.service";
import { SWIPE_RANK_METRIC_VERSION } from "./constants";
import type { SwipeRankPeriodBounds } from "./periods";

interface ReviewEntryRow extends Record<string, unknown> {
  entry_id: string;
  profile_id: string;
  provider_profile_id: string;
  snapshot_id: string;
  period_kind: "MONTH" | "QUARTER" | "YEAR";
  period_start: string;
  period_end: string;
  rank: number | string;
  field_size: number | string;
  metric_numerator: number | string;
  metric_denominator: number | string;
  metric_value: number | string;
  active_days: number | string | null;
  observed_days: number | string | null;
  swipes_per_active_day: number | string | null;
  quality_flags: string[] | null;
  gender: string | null;
  interested_in: string | null;
  age_in_period: number | string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  is_swipe_rank_excluded: boolean;
  profile_first_day: Date | string | null;
  profile_last_day: Date | string | null;
  bio: string | null;
}

interface MonthlyFactRow extends Record<string, unknown> {
  period_start: string;
  period_end: string;
  swipe_likes: number | string | null;
  swipe_passes: number | string | null;
  matches: number | string | null;
  messages_sent: number | string | null;
  messages_received: number | string | null;
  app_opens: number | string | null;
  active_days: number | string;
  observed_days: number | string;
  match_rate: number | string | null;
  swipes_per_active_day: number | string | null;
  quality_flags: string[] | null;
}

interface DailyShapeRow extends Record<string, unknown> {
  observed_days: number | string;
  days_with_activity: number | string;
  days_matches_over_likes: number | string;
  days_matches_with_zero_likes: number | string;
  matches_on_zero_like_days: number | string;
  max_daily_likes: number | string;
  max_daily_matches: number | string;
  max_daily_swipes: number | string;
  negative_rows: number | string;
}

interface CohortShapeRow extends Record<string, unknown> {
  yield_median: number | string | null;
  yield_p90: number | string | null;
  yield_p99: number | string | null;
  swipes_per_day_median: number | string | null;
  swipes_per_day_p90: number | string | null;
  swipes_per_day_p99: number | string | null;
}

interface MessageSummaryRow extends Record<string, unknown> {
  conversation_count: number | string;
  conversations_with_messages: number | string;
  message_count: number | string;
  unique_text_count: number | string;
  max_thread_messages: number | string;
  median_thread_messages: number | string | null;
  messages_with_urls: number | string;
}

interface MessageSampleRow extends Record<string, unknown> {
  match_id: string;
  message_order: number | string;
  content: string;
  message_type: string;
  sent_date: Date | string;
}

interface RepeatedMessageRow extends Record<string, unknown> {
  content: string;
  occurrences: number | string;
}

interface MediaRow extends Record<string, unknown> {
  url: string;
}

interface ReachableImage {
  url: string;
  mediaType: string;
}

export interface SwipeRankAiReviewTarget {
  profileId: string;
  providerProfileId: string;
  rank: number;
  excluded: boolean;
}

export interface ReviewSwipeRankProfileInput {
  profileId: string;
  actor: string;
  force?: boolean;
}

export interface ReviewSwipeRankCohortInput {
  period: SwipeRankPeriodBounds;
  limit: number;
  concurrency: number;
  actor: string;
  includeExcluded?: boolean;
  force?: boolean;
  onCompleted?: (row: SwipeRankAiReviewRunRow) => void;
  onFailed?: (row: SwipeRankAiReviewRunError) => void;
}

export interface SwipeRankAiReviewRunRow {
  rank: number;
  shortId: string;
  verdict: string;
  confidence: number;
  summary: string;
  created: boolean;
  alreadyExcluded: boolean;
  holdApplied: boolean;
}

export interface SwipeRankAiReviewRunError {
  rank: number;
  shortId: string;
  error: string;
}

function number(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function date(value: Date | string | null): string | null {
  if (value === null) return null;
  return (value instanceof Date ? value.toISOString() : String(value)).slice(
    0,
    10,
  );
}

function uniqueSignals<T extends { finding: string; evidence: string }>(
  signals: T[],
) {
  return [
    ...new Map(
      signals.map((signal) => [
        `${signal.finding}\u0000${signal.evidence}`,
        signal,
      ]),
    ).values(),
  ];
}

async function getPublishedPlacements(
  profileId: string,
): Promise<ReviewEntryRow[]> {
  const result = await db.execute<ReviewEntryRow>(sql`
    WITH latest_snapshots AS (
      SELECT DISTINCT ON (
        snapshot.period_kind,
        snapshot.period_start,
        snapshot.period_end
      ) snapshot.*
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND snapshot.status = 'PUBLISHED'
      ORDER BY
        snapshot.period_kind,
        snapshot.period_start,
        snapshot.period_end,
        snapshot.published_at DESC,
        snapshot.id DESC
    )
    SELECT
      entry.id AS entry_id,
      entry.profile_id,
      profile.provider_profile_id,
      entry.snapshot_id,
      snapshot.period_kind,
      snapshot.period_start::text,
      snapshot.period_end::text,
      entry.rank,
      entry.field_size,
      entry.metric_numerator,
      entry.metric_denominator,
      entry.metric_value,
      entry.active_days,
      entry.observed_days,
      entry.swipes_per_active_day,
      entry.quality_flags,
      profile.gender::text,
      profile.interested_in::text,
      entry.age_in_period,
      profile.city,
      profile.region,
      profile.country,
      profile.is_swipe_rank_excluded,
      tinder_profile.first_day_on_app AS profile_first_day,
      tinder_profile.last_day_on_app AS profile_last_day,
      tinder_profile.bio
    FROM latest_snapshots snapshot
    JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
    JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
    JOIN tinder_profile
      ON tinder_profile.tinder_id = profile.provider_profile_id
    WHERE profile.id = ${profileId}
      AND profile.is_synthetic = false
    ORDER BY snapshot.period_start DESC, snapshot.period_kind, entry.id
  `);
  if (result.rows.length === 0) {
    throw new Error(
      `SwipeRank profile ${profileId} has no current published placements.`,
    );
  }
  return result.rows;
}

async function getMonthlyHistory(profileId: string) {
  const result = await db.execute<MonthlyFactRow>(sql`
    SELECT
      period_start::text,
      period_end::text,
      swipe_likes,
      swipe_passes,
      matches,
      messages_sent,
      messages_received,
      app_opens,
      active_days,
      observed_days,
      match_rate,
      swipes_per_active_day,
      quality_flags
    FROM swipe_rank_period_fact
    WHERE profile_id = ${profileId}
      AND metric_version = ${SWIPE_RANK_METRIC_VERSION}
      AND period_kind = 'MONTH'
    ORDER BY period_start
  `);
  return result.rows.map((row) => ({
    periodStart: row.period_start,
    periodEnd: row.period_end,
    rightSwipes: number(row.swipe_likes),
    leftSwipes: number(row.swipe_passes),
    matches: number(row.matches),
    messagesSent: number(row.messages_sent),
    messagesReceived: number(row.messages_received),
    appOpens: number(row.app_opens),
    activeDays: number(row.active_days),
    observedDays: number(row.observed_days),
    matchYield: nullableNumber(row.match_rate),
    swipesPerActiveDay: nullableNumber(row.swipes_per_active_day),
    qualityFlags: row.quality_flags ?? [],
  }));
}

async function getDailyShape(entry: ReviewEntryRow) {
  const result = await db.execute<DailyShapeRow>(sql`
    SELECT
      count(*)::int AS observed_days,
      count(*) FILTER (
        WHERE swipe_likes > 0 OR swipe_passes > 0 OR matches > 0
      )::int AS days_with_activity,
      count(*) FILTER (WHERE matches > swipe_likes)::int
        AS days_matches_over_likes,
      count(*) FILTER (WHERE matches > 0 AND swipe_likes = 0)::int
        AS days_matches_with_zero_likes,
      coalesce(sum(matches) FILTER (
        WHERE matches > 0 AND swipe_likes = 0
      ), 0)::bigint AS matches_on_zero_like_days,
      coalesce(max(swipe_likes), 0)::int AS max_daily_likes,
      coalesce(max(matches), 0)::int AS max_daily_matches,
      coalesce(max(swipe_likes + swipe_passes), 0)::int AS max_daily_swipes,
      count(*) FILTER (
        WHERE app_opens < 0 OR matches < 0 OR swipe_likes < 0
          OR swipe_passes < 0 OR messages_sent < 0 OR messages_received < 0
      )::int AS negative_rows
    FROM tinder_usage
    WHERE tinder_profile_id = ${entry.provider_profile_id}
  `);
  const row = result.rows[0];
  return {
    observedDays: number(row?.observed_days),
    daysWithActivity: number(row?.days_with_activity),
    daysMatchesOverLikes: number(row?.days_matches_over_likes),
    daysMatchesWithZeroLikes: number(row?.days_matches_with_zero_likes),
    matchesOnZeroLikeDays: number(row?.matches_on_zero_like_days),
    maxDailyLikes: number(row?.max_daily_likes),
    maxDailyMatches: number(row?.max_daily_matches),
    maxDailySwipes: number(row?.max_daily_swipes),
    negativeRows: number(row?.negative_rows),
  };
}

async function getCohortShape(snapshotId: string) {
  const result = await db.execute<CohortShapeRow>(sql`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY metric_value)
        AS yield_median,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY metric_value)
        AS yield_p90,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value)
        AS yield_p99,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY swipes_per_active_day)
        FILTER (WHERE swipes_per_active_day IS NOT NULL)
        AS swipes_per_day_median,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY swipes_per_active_day)
        FILTER (WHERE swipes_per_active_day IS NOT NULL)
        AS swipes_per_day_p90,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY swipes_per_active_day)
        FILTER (WHERE swipes_per_active_day IS NOT NULL)
        AS swipes_per_day_p99
    FROM swipe_rank_entry
    WHERE snapshot_id = ${snapshotId}
  `);
  const row = result.rows[0];
  return {
    yieldMedian: nullableNumber(row?.yield_median),
    yieldP90: nullableNumber(row?.yield_p90),
    yieldP99: nullableNumber(row?.yield_p99),
    swipesPerActiveDayMedian: nullableNumber(row?.swipes_per_day_median),
    swipesPerActiveDayP90: nullableNumber(row?.swipes_per_day_p90),
    swipesPerActiveDayP99: nullableNumber(row?.swipes_per_day_p99),
  };
}

async function getMessageEvidence(providerProfileId: string) {
  const [summaryResult, sampleResult, repeatedResult] = await Promise.all([
    db.execute<MessageSummaryRow>(sql`
      WITH thread_counts AS (
        SELECT total_message_count
        FROM match
        WHERE tinder_profile_id = ${providerProfileId}
      )
      SELECT
        (SELECT count(*) FROM thread_counts)::int AS conversation_count,
        (SELECT count(*) FROM thread_counts WHERE total_message_count > 0)::int
          AS conversations_with_messages,
        count(message.id)::int AS message_count,
        count(DISTINCT nullif(lower(btrim(message.content)), ''))::int
          AS unique_text_count,
        coalesce((SELECT max(total_message_count) FROM thread_counts), 0)::int
          AS max_thread_messages,
        (SELECT percentile_cont(0.5) WITHIN GROUP (
          ORDER BY total_message_count
        ) FROM thread_counts WHERE total_message_count > 0)
          AS median_thread_messages,
        count(*) FILTER (
          WHERE message.content ~* '(https?://|www\\.|@[a-z0-9_.]{2,})'
        )::int AS messages_with_urls
      FROM message
      WHERE message.tinder_profile_id = ${providerProfileId}
    `),
    db.execute<MessageSampleRow>(sql`
      WITH candidate_matches AS (
        SELECT
          id,
          row_number() OVER (
            ORDER BY total_message_count DESC, id
          ) AS depth_rank,
          row_number() OVER (
            ORDER BY last_message_at DESC NULLS LAST, id
          ) AS recency_rank
        FROM match
        WHERE tinder_profile_id = ${providerProfileId}
          AND total_message_count > 0
      ), selected_matches AS (
        SELECT id
        FROM candidate_matches
        WHERE depth_rank <= 3 OR recency_rank <= 3
      ), ranked_messages AS (
        SELECT
          message.match_id,
          message.order AS message_order,
          message.content,
          message.message_type::text,
          message.sent_date,
          row_number() OVER (
            PARTITION BY message.match_id ORDER BY message.order
          ) AS first_rank,
          row_number() OVER (
            PARTITION BY message.match_id ORDER BY message.order DESC
          ) AS last_rank
        FROM message
        JOIN selected_matches ON selected_matches.id = message.match_id
        WHERE message.tinder_profile_id = ${providerProfileId}
      )
      SELECT match_id, message_order, content, message_type, sent_date
      FROM ranked_messages
      WHERE first_rank <= 3 OR last_rank <= 3
      ORDER BY match_id, message_order
      LIMIT 30
    `),
    db.execute<RepeatedMessageRow>(sql`
      SELECT btrim(content) AS content, count(*)::int AS occurrences
      FROM message
      WHERE tinder_profile_id = ${providerProfileId}
        AND message_type = 'TEXT'
        AND length(btrim(content)) BETWEEN 1 AND 200
      GROUP BY lower(btrim(content)), btrim(content)
      HAVING count(*) > 1
      ORDER BY count(*) DESC, lower(btrim(content))
      LIMIT 8
    `),
  ]);

  const summary = summaryResult.rows[0];
  const conversationAliases = new Map<string, string>();
  const sample = sampleResult.rows.map((row) => {
    if (!conversationAliases.has(row.match_id)) {
      conversationAliases.set(
        row.match_id,
        String.fromCharCode(65 + conversationAliases.size),
      );
    }
    return {
      conversation: conversationAliases.get(row.match_id)!,
      order: number(row.message_order),
      date: date(row.sent_date),
      type: row.message_type,
      text:
        row.message_type === "TEXT"
          ? redactSwipeRankReviewMessage(row.content)
          : `[${row.message_type}]`,
    };
  });
  return {
    summary: {
      conversationCount: number(summary?.conversation_count),
      conversationsWithMessages: number(summary?.conversations_with_messages),
      outgoingMessageCount: number(summary?.message_count),
      uniqueOutgoingTextCount: number(summary?.unique_text_count),
      maxThreadMessages: number(summary?.max_thread_messages),
      medianMessagesInNonemptyThread: nullableNumber(
        summary?.median_thread_messages,
      ),
      messagesWithUrlsOrHandles: number(summary?.messages_with_urls),
    },
    repeatedMessages: repeatedResult.rows.map((row) => ({
      text: redactSwipeRankReviewMessage(row.content),
      occurrences: number(row.occurrences),
    })),
    sample,
  };
}

async function getReachableImages(providerProfileId: string) {
  const result = await db.execute<MediaRow>(sql`
    SELECT url
    FROM media
    WHERE tinder_profile_id = ${providerProfileId}
      AND type IN ('image', 'photo')
    ORDER BY id
    LIMIT 4
  `);
  const candidates = result.rows.flatMap((row) => {
    try {
      const url = new URL(row.url);
      return url.protocol === "https:" || url.protocol === "http:"
        ? [url.toString()]
        : [];
    } catch {
      return [];
    }
  });

  const reachable = await Promise.all(
    candidates.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(4_000),
        });
        if (!response.ok) return null;
        const contentType = response.headers
          .get("content-type")
          ?.split(";", 1)[0]
          ?.trim();
        return {
          url,
          mediaType: contentType?.startsWith("image/") ? contentType : "image",
        } satisfies ReachableImage;
      } catch {
        return null;
      }
    }),
  );
  return {
    candidateCount: candidates.length,
    files: reachable
      .filter((image): image is ReachableImage => image !== null)
      .slice(0, 3),
  };
}

export async function buildSwipeRankAiReviewEvidence(profileId: string) {
  const placements = await getPublishedPlacements(profileId);
  const entry = placements[0]!;
  const [monthlyHistory, dailyShape, cohortShape, messageEvidence, images] =
    await Promise.all([
      getMonthlyHistory(entry.profile_id),
      getDailyShape(entry),
      getCohortShape(entry.snapshot_id),
      getMessageEvidence(entry.provider_profile_id),
      getReachableImages(entry.provider_profile_id),
    ]);

  const placementEvidence = placements.map((placement) => ({
    period: {
      kind: placement.period_kind,
      start: placement.period_start,
      end: placement.period_end,
    },
    rank: number(placement.rank),
    fieldSize: number(placement.field_size),
    topSharePercent:
      number(placement.field_size) > 0
        ? (number(placement.rank) / number(placement.field_size)) * 100
        : null,
    matchYield: number(placement.metric_value),
    observedMatches: number(placement.metric_numerator),
    rightSwipes: number(placement.metric_denominator),
    activeDays: number(placement.active_days),
    observedDays: number(placement.observed_days),
    ageInPeriod: nullableNumber(placement.age_in_period),
    swipesPerActiveDay: nullableNumber(placement.swipes_per_active_day),
    qualityFlags: placement.quality_flags ?? [],
  }));
  const mechanicalSignals = uniqueSignals([
    ...monthlyHistory.flatMap((month) =>
      buildSwipeRankMechanicalSignals({
        rightSwipes: month.rightSwipes,
        leftSwipes: month.leftSwipes,
        swipesPerActiveDay: month.swipesPerActiveDay,
        priorSwipesPerActiveDay: monthlyHistory
          .filter((fact) => fact.periodStart < month.periodStart)
          .flatMap((fact) =>
            fact.swipesPerActiveDay === null ? [] : [fact.swipesPerActiveDay],
          ),
        negativeDailyRows: 0,
      }),
    ),
    ...buildSwipeRankMechanicalSignals({
      rightSwipes: 0,
      leftSwipes: 0,
      swipesPerActiveDay: null,
      priorSwipesPerActiveDay: [],
      negativeDailyRows: dailyShape.negativeRows,
    }),
  ]);

  const evidence = {
    reviewScope: {
      profileLevel: true,
      placementCount: placementEvidence.length,
      monthlyHistoryCount: monthlyHistory.length,
      earliestPlacement: placements.at(-1)?.period_start ?? null,
      latestPlacement: entry.period_start,
    },
    leaderboardEntry: {
      period: {
        kind: entry.period_kind,
        start: entry.period_start,
        end: entry.period_end,
      },
      rank: number(entry.rank),
      fieldSize: number(entry.field_size),
      matchYield: number(entry.metric_value),
      observedMatches: number(entry.metric_numerator),
      rightSwipes: number(entry.metric_denominator),
      activeDays: number(entry.active_days),
      observedDays: number(entry.observed_days),
      swipesPerActiveDay: nullableNumber(entry.swipes_per_active_day),
      qualityFlags: entry.quality_flags ?? [],
    },
    placements: placementEvidence,
    profile: {
      gender: entry.gender,
      interestedIn: entry.interested_in,
      ageInPeriod: nullableNumber(entry.age_in_period),
      location: [entry.city, entry.region, entry.country]
        .filter(Boolean)
        .join(", "),
      observedProfileStart: date(entry.profile_first_day),
      observedProfileEnd: date(entry.profile_last_day),
      bio: entry.bio
        ? redactSwipeRankReviewMessage(entry.bio).slice(0, 1_000)
        : null,
    },
    cohortShape,
    cohortComparison: buildSwipeRankCohortComparison({
      matchYield: number(entry.metric_value),
      swipesPerActiveDay: nullableNumber(entry.swipes_per_active_day),
      cohortShape,
    }),
    mechanicalSignals,
    dailyShape,
    monthlyHistory,
    messages: messageEvidence,
    images: {
      storedCandidates: images.candidateCount,
      suppliedToModel: images.files.length,
    },
  };

  return { entry, placements, evidence, imageFiles: images.files };
}

export async function listSwipeRankAiReviewTargets(input: {
  period: SwipeRankPeriodBounds;
  limit: number;
  includeExcluded?: boolean;
}): Promise<SwipeRankAiReviewTarget[]> {
  const result = await db.execute<
    Record<string, unknown> & {
      profile_id: string;
      provider_profile_id: string;
      rank: number | string;
      is_swipe_rank_excluded: boolean;
    }
  >(sql`
    WITH period_snapshots AS (
      SELECT DISTINCT ON (
        snapshot.period_kind,
        snapshot.period_start,
        snapshot.period_end
      ) snapshot.id, snapshot.published_at
      FROM swipe_rank_snapshot snapshot
      WHERE snapshot.data_provider = 'TINDER'
        AND snapshot.metric_version = ${SWIPE_RANK_METRIC_VERSION}
        AND snapshot.period_kind = ${input.period.kind}
        AND snapshot.period_start = ${input.period.start}::date
        AND snapshot.period_end = ${input.period.end}::date
        AND snapshot.status = 'PUBLISHED'
      ORDER BY
        snapshot.period_kind,
        snapshot.period_start,
        snapshot.period_end,
        snapshot.published_at DESC,
        snapshot.id DESC
    ), latest_profile_entry AS (
      SELECT DISTINCT ON (profile.id)
        profile.id AS profile_id,
        profile.provider_profile_id,
        entry.rank,
        profile.is_swipe_rank_excluded
      FROM period_snapshots snapshot
      JOIN swipe_rank_entry entry ON entry.snapshot_id = snapshot.id
      JOIN swipe_rank_profile profile ON profile.id = entry.profile_id
      WHERE profile.is_synthetic = false
        AND (
          ${input.includeExcluded ?? true}::boolean
          OR profile.is_swipe_rank_excluded = false
        )
      ORDER BY profile.id, snapshot.published_at DESC, snapshot.id DESC
    )
    SELECT
      profile_id,
      provider_profile_id,
      rank,
      is_swipe_rank_excluded
    FROM latest_profile_entry
    ORDER BY rank, provider_profile_id
    LIMIT ${input.limit}
  `);
  return result.rows.map((row) => ({
    profileId: row.profile_id,
    providerProfileId: row.provider_profile_id,
    rank: number(row.rank),
    excluded: row.is_swipe_rank_excluded,
  }));
}

export async function reviewSwipeRankProfile(
  input: ReviewSwipeRankProfileInput,
) {
  const { entry, evidence, imageFiles } = await buildSwipeRankAiReviewEvidence(
    input.profileId,
  );
  const modelInputHash = createHash("sha256")
    .update(JSON.stringify({ evidence, imageFiles }))
    .digest("hex");
  const existing = await db.query.swipeRankProfileAiReviewTable.findFirst({
    where: and(
      eq(swipeRankProfileAiReviewTable.profileId, input.profileId),
      eq(
        swipeRankProfileAiReviewTable.reviewVersion,
        SWIPE_RANK_AI_REVIEW_VERSION,
      ),
      eq(swipeRankProfileAiReviewTable.model, SWIPE_RANK_AI_REVIEW_MODEL),
    ),
  });
  if (
    shouldReuseSwipeRankProfileReview({
      storedModelInputHash: existing?.modelInputHash ?? null,
      currentModelInputHash: modelInputHash,
      force: input.force,
    })
  ) {
    if (!existing) {
      throw new Error("A reusable SwipeRank review was not found.");
    }
    const hold = await enforceSwipeRankAiReviewHold({
      entry,
      verdict: existing.verdict,
      summary: existing.summary,
      actor: input.actor,
    });
    return { review: existing, created: false, hold };
  }

  const prompt = buildSwipeRankReviewPrompt(evidence);
  const rawOutput = await generateStructured({
    schema: swipeRankAiReviewOutputSchema,
    name: "SwipeRankProfileReview",
    description:
      "An internal trust review of one stable SwipeRank profile across its published seasons.",
    model: SWIPE_RANK_AI_REVIEW_MODEL,
    maxOutputTokens: 4_096,
    providerOptions: {
      anthropic: {
        structuredOutputMode: "outputFormat",
        thinking: { type: "disabled" },
      },
    },
    validationRetries: 1,
    logTag: "[swipe-rank-ai-review]",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageFiles.map((image) => ({
            type: "file" as const,
            data: new URL(image.url),
            mediaType: image.mediaType,
          })),
        ],
      },
    ],
  });
  const outputWithMechanicalSignals = {
    ...rawOutput,
    signals: [...rawOutput.signals, ...evidence.mechanicalSignals],
  };
  const policyOutput = applySwipeRankAiReviewPolicy(
    outputWithMechanicalSignals,
  );
  const output =
    rawOutput.verdict === "CLEAR" && policyOutput.verdict === "NEEDS_REVIEW"
      ? {
          ...policyOutput,
          summary:
            "A bounded source-level check found an extreme activity or data-integrity signal. Sonnet found the remaining message and image evidence coherent. An administrator should verify the source profile.",
          recommendedAction:
            "Open the source profile and verify the high-severity mechanical signal.",
        }
      : policyOutput;

  const evidenceSummary = {
    reviewVersion: SWIPE_RANK_AI_REVIEW_VERSION,
    profileLevel: true,
    placementCount: evidence.placements.length,
    earliestPlacement: evidence.reviewScope.earliestPlacement,
    latestPlacement: evidence.reviewScope.latestPlacement,
    monthlyHistoryCount: evidence.monthlyHistory.length,
    outgoingMessageCount: evidence.messages.summary.outgoingMessageCount,
    messageSampleCount: evidence.messages.sample.length,
    imageCount: imageFiles.length,
  };
  const now = new Date();
  const rows = await db
    .insert(swipeRankProfileAiReviewTable)
    .values({
      profileId: entry.profile_id,
      reviewVersion: SWIPE_RANK_AI_REVIEW_VERSION,
      model: SWIPE_RANK_AI_REVIEW_MODEL,
      verdict: output.verdict,
      confidence: output.confidence,
      summary: output.summary.trim(),
      recommendedAction: output.recommendedAction.trim(),
      signals: output.signals,
      evidenceSummary,
      modelInputHash,
      reviewedBy: input.actor.trim(),
      reviewedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        swipeRankProfileAiReviewTable.profileId,
        swipeRankProfileAiReviewTable.reviewVersion,
        swipeRankProfileAiReviewTable.model,
      ],
      set: {
        verdict: output.verdict,
        confidence: output.confidence,
        summary: output.summary.trim(),
        recommendedAction: output.recommendedAction.trim(),
        signals: output.signals,
        evidenceSummary,
        modelInputHash,
        reviewedBy: input.actor.trim(),
        reviewedAt: now,
        updatedAt: now,
      },
    })
    .returning();
  const review = rows[0]!;
  const hold = await enforceSwipeRankAiReviewHold({
    entry,
    verdict: review.verdict,
    summary: review.summary,
    actor: input.actor,
  });
  return { review, created: !existing, hold };
}

async function enforceSwipeRankAiReviewHold(input: {
  entry: ReviewEntryRow;
  verdict: "CLEAR" | "NEEDS_REVIEW" | "EXCLUDE_RECOMMENDED";
  summary: string;
  actor: string;
}) {
  const required = swipeRankAiReviewRequiresHold(input.verdict);
  if (!required || input.entry.is_swipe_rank_excluded) {
    return {
      required,
      applied: false,
      alreadyExcluded: input.entry.is_swipe_rank_excluded,
    };
  }
  await setTinderSwipeRankExclusion({
    providerProfileId: input.entry.provider_profile_id,
    excluded: true,
    reason: buildSwipeRankAiReviewHoldReason(input.summary),
    actor: input.actor,
  });
  return { required: true, applied: true, alreadyExcluded: false };
}

/** Run a bounded, resumable cohort review for cron and operator tooling. */
export async function reviewSwipeRankCohort(input: ReviewSwipeRankCohortInput) {
  const targets = await listSwipeRankAiReviewTargets({
    period: input.period,
    limit: input.limit,
    includeExcluded: input.includeExcluded,
  });
  const results: SwipeRankAiReviewRunRow[] = [];
  const errors: SwipeRankAiReviewRunError[] = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const target = targets[cursor++];
      if (!target) return;
      const shortId = target.providerProfileId.slice(0, 10);
      try {
        const result = await reviewSwipeRankProfile({
          profileId: target.profileId,
          actor: input.actor,
          force: input.force,
        });
        const row = {
          rank: target.rank,
          shortId,
          verdict: result.review.verdict,
          confidence: result.review.confidence,
          summary: result.review.summary,
          created: result.created,
          alreadyExcluded: target.excluded,
          holdApplied: result.hold.applied,
        } satisfies SwipeRankAiReviewRunRow;
        results.push(row);
        input.onCompleted?.(row);
      } catch (error) {
        const row = {
          rank: target.rank,
          shortId,
          error: error instanceof Error ? error.message : String(error),
        } satisfies SwipeRankAiReviewRunError;
        errors.push(row);
        input.onFailed?.(row);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(input.concurrency, targets.length) }, worker),
  );
  results.sort((left, right) => left.rank - right.rank);
  errors.sort((left, right) => left.rank - right.rank);
  const verdictCounts = results.reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.verdict] = (counts[row.verdict] ?? 0) + 1;
      return counts;
    },
    {},
  );
  return {
    requested: targets.length,
    completed: results.length,
    failed: errors.length,
    verdictCounts,
    results,
    errors,
  };
}
