import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { isAnonymousEmail } from "@/lib/utils/auth";
import {
  requiresSwipeRankPublicationConsent,
  type SwipeRankPublicationLocationGranularity,
} from "@/lib/swipe-rank/publication-consent";
import { db, withTransaction } from "@/server/db";
import {
  swipeRankProfileTable,
  swipeRankPublicationEventTable,
  swipeRankPublicationTable,
  tinderProfileTable,
  type SwipeRankPeriodKind,
  userTable,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";

import {
  SWIPE_RANK_METRIC_VERSION,
  SWIPE_RANK_PERIOD_KINDS,
} from "./constants";
import { SWIPE_RANK_ELIGIBILITY_V1 } from "./eligibility";
import { assertAlignedPeriod, type SwipeRankPeriodBounds } from "./periods";
import { completedFullSwipeRankBuildSql } from "./readiness";

export const SWIPE_RANK_PUBLICATION_CONSENT_VERSION = 2;
export const SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE = 25;

export type SwipeRankLocationGranularity =
  SwipeRankPublicationLocationGranularity;

export interface SwipeRankPublicationPreferences {
  alias: string;
  showGender: boolean;
  showAgeBand: boolean;
  showInterestedIn: boolean;
  locationGranularity: SwipeRankLocationGranularity;
}

export interface SwipeRankPublicationState extends SwipeRankPublicationPreferences {
  status: "PRIVATE" | "PUBLIC";
  publicKey: string | null;
  canPublish: boolean;
  consentVersion: number | null;
  consentedAt: string | null;
  revokedAt: string | null;
}

export interface PublicSwipeRankEntry {
  entryKey: string;
  alias: string;
  rank: number;
  tieCount: number;
  fieldSize: number;
  percentile: number;
  topShare: number;
  matchYieldPercent: number;
  gender: string | null;
  interestedIn: string | null;
  ageBand: string | null;
  location: string | null;
}

export interface PublicSwipeRankLeaderboard {
  ready: boolean;
  metricVersion: string;
  period: SwipeRankPeriodBounds;
  asOf: string | null;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  minimumPublicFieldSize: number;
  fieldSize: number | null;
  publishedProfiles: number | null;
  countsSuppressed: boolean;
  entries: PublicSwipeRankEntry[];
}

export interface PublicSwipeRankPeriodSummary {
  period: SwipeRankPeriodBounds;
  asOf: string;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  fieldSize: number;
  publishedProfiles: number;
}

export interface PublicSwipeRankPeriods {
  metricVersion: string;
  minimumPublicFieldSize: number;
  periods: PublicSwipeRankPeriodSummary[];
}

interface PublicationOwner {
  profileId: string;
  isAnonymous: boolean | null;
  email: string | null;
}

interface PublicLeaderboardQueryRow extends Record<string, unknown> {
  ready: boolean;
  public_key: string | null;
  alias: string | null;
  rank: number | string | null;
  tie_count: number | string | null;
  field_size: number | string;
  published_profiles: number | string;
  metric_value: number | string | null;
  gender: string | null;
  interested_in: string | null;
  age_in_period: number | string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  location_granularity: SwipeRankLocationGranularity | null;
  show_gender: boolean | null;
  show_age_band: boolean | null;
  show_interested_in: boolean | null;
  as_of: string | Date | null;
}

interface PublicPeriodSummaryRow extends Record<string, unknown> {
  period_kind: SwipeRankPeriodKind;
  period_start: string;
  period_end: string;
  as_of: string | Date;
  field_size: number | string;
  published_profiles: number | string;
}

const DEFAULT_PREFERENCES: SwipeRankPublicationPreferences = {
  alias: "Anonymous dater",
  showGender: false,
  showAgeBand: false,
  showInterestedIn: false,
  locationGranularity: "NONE",
};

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function normalizeSwipeRankPublicAlias(alias: string): string {
  return alias.trim().replace(/\s+/g, " ") || DEFAULT_PREFERENCES.alias;
}

export function getSwipeRankPublicAgeBand(age: number | null): string | null {
  if (age === null || !Number.isInteger(age) || age < 18 || age > 100) {
    return null;
  }
  if (age < 25) return "18–24";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  return "55+";
}

export function canPublishSwipeRank(
  owner: Pick<PublicationOwner, "email" | "isAnonymous">,
) {
  return (
    owner.isAnonymous !== true &&
    !!owner.email &&
    !isAnonymousEmail(owner.email)
  );
}

function assertPublicLeaderboardInput(input: {
  minimumRateDenominator: number;
  minimumActiveDays: number;
  limit: number;
  offset: number;
}) {
  if (
    !Number.isSafeInteger(input.minimumRateDenominator) ||
    input.minimumRateDenominator < 0 ||
    !Number.isSafeInteger(input.minimumActiveDays) ||
    input.minimumActiveDays < 0
  ) {
    throw new Error(
      "SwipeRank public eligibility thresholds must be non-negative integers.",
    );
  }
  if (
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100
  ) {
    throw new Error(
      "SwipeRank public leaderboard limit must be between 1 and 100.",
    );
  }
  if (
    !Number.isSafeInteger(input.offset) ||
    input.offset < 0 ||
    input.offset > 10_000
  ) {
    throw new Error(
      "SwipeRank public leaderboard offset must be between 0 and 10000.",
    );
  }
}

async function getPublicationOwner(
  tinderId: string,
  userId: string,
): Promise<PublicationOwner | null> {
  const rows = await db
    .select({
      profileId: swipeRankProfileTable.id,
      isAnonymous: userTable.isAnonymous,
      email: userTable.email,
    })
    .from(tinderProfileTable)
    .innerJoin(userTable, eq(userTable.id, tinderProfileTable.userId))
    .innerJoin(
      swipeRankProfileTable,
      and(
        eq(swipeRankProfileTable.dataProvider, "TINDER"),
        eq(
          swipeRankProfileTable.providerProfileId,
          tinderProfileTable.tinderId,
        ),
        eq(swipeRankProfileTable.userId, tinderProfileTable.userId),
      ),
    )
    .where(
      and(
        eq(tinderProfileTable.tinderId, tinderId),
        eq(tinderProfileTable.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getSwipeRankPublication(
  tinderId: string,
  userId: string,
): Promise<SwipeRankPublicationState> {
  const owner = await getPublicationOwner(tinderId, userId);
  if (!owner) {
    throw new Error(
      "SwipeRank is not ready for this profile or the profile is not owned by this user.",
    );
  }

  const publication = await db.query.swipeRankPublicationTable.findFirst({
    where: and(
      eq(swipeRankPublicationTable.profileId, owner.profileId),
      eq(swipeRankPublicationTable.userId, userId),
    ),
  });

  return {
    ...(publication
      ? {
          alias: publication.alias,
          showGender: publication.showGender,
          showAgeBand: publication.showAgeBand,
          showInterestedIn: publication.showInterestedIn,
          locationGranularity: publication.locationGranularity,
        }
      : DEFAULT_PREFERENCES),
    status: publication?.status ?? "PRIVATE",
    publicKey: publication?.status === "PUBLIC" ? publication.publicKey : null,
    canPublish: canPublishSwipeRank(owner),
    consentVersion: publication?.consentVersion ?? null,
    consentedAt: iso(publication?.consentedAt ?? null),
    revokedAt: iso(publication?.revokedAt ?? null),
  };
}

export async function updateSwipeRankPublication(input: {
  tinderId: string;
  userId: string;
  consentToPublicRanking: boolean;
  preferences: SwipeRankPublicationPreferences;
}): Promise<SwipeRankPublicationState> {
  const owner = await getPublicationOwner(input.tinderId, input.userId);
  if (!owner) {
    throw new Error(
      "SwipeRank is not ready for this profile or the profile is not owned by this user.",
    );
  }
  if (!canPublishSwipeRank(owner)) {
    throw new Error(
      "Convert the anonymous account to a claimed account before publishing a rank.",
    );
  }

  await withTransaction(async (tx) => {
    const existingPublication =
      await tx.query.swipeRankPublicationTable.findFirst({
        where: and(
          eq(swipeRankPublicationTable.profileId, owner.profileId),
          eq(swipeRankPublicationTable.userId, input.userId),
        ),
      });
    const requiresRenewedConsent = requiresSwipeRankPublicationConsent(
      existingPublication?.status ?? null,
      existingPublication ?? DEFAULT_PREFERENCES,
      input.preferences,
    );
    if (requiresRenewedConsent && !input.consentToPublicRanking) {
      throw new Error(
        "Explicit consent is required to publish or expand public SwipeRank descriptors.",
      );
    }

    const alias = normalizeSwipeRankPublicAlias(input.preferences.alias);
    const now = new Date();
    const consentVersion = requiresRenewedConsent
      ? SWIPE_RANK_PUBLICATION_CONSENT_VERSION
      : (existingPublication?.consentVersion ??
        SWIPE_RANK_PUBLICATION_CONSENT_VERSION);
    const consentedAt = requiresRenewedConsent
      ? now
      : (existingPublication?.consentedAt ?? now);
    const replacementPublicKey = createId("rank");
    const persisted = await tx
      .insert(swipeRankPublicationTable)
      .values({
        id: createId("srpub"),
        profileId: owner.profileId,
        userId: input.userId,
        publicKey: replacementPublicKey,
        status: "PUBLIC",
        alias,
        showGender: input.preferences.showGender,
        showAgeBand: input.preferences.showAgeBand,
        showInterestedIn: input.preferences.showInterestedIn,
        locationGranularity: input.preferences.locationGranularity,
        consentVersion,
        consentedAt,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: swipeRankPublicationTable.profileId,
        set: {
          userId: input.userId,
          publicKey: sql`CASE
            WHEN ${swipeRankPublicationTable.userId} <> ${input.userId}
              OR ${swipeRankPublicationTable.status} <> 'PUBLIC'
            THEN ${replacementPublicKey}
            ELSE ${swipeRankPublicationTable.publicKey}
          END`,
          status: "PUBLIC",
          alias,
          showGender: input.preferences.showGender,
          showAgeBand: input.preferences.showAgeBand,
          showInterestedIn: input.preferences.showInterestedIn,
          locationGranularity: input.preferences.locationGranularity,
          consentVersion,
          consentedAt,
          revokedAt: null,
          updatedAt: now,
        },
      })
      .returning({ id: swipeRankPublicationTable.id });
    const publicationId = persisted[0]?.id;
    if (!publicationId) {
      throw new Error("SwipeRank publication settings could not be saved.");
    }

    await tx.insert(swipeRankPublicationEventTable).values({
      id: createId("srpe"),
      publicationId,
      profileId: owner.profileId,
      userId: input.userId,
      eventType:
        existingPublication?.status !== "PUBLIC"
          ? "PUBLISHED"
          : requiresRenewedConsent
            ? "CONSENT_RENEWED"
            : "SETTINGS_UPDATED",
      consentVersion,
      explicitConsentReceived: requiresRenewedConsent,
      preferences: {
        alias,
        showGender: input.preferences.showGender,
        showAgeBand: input.preferences.showAgeBand,
        showInterestedIn: input.preferences.showInterestedIn,
        locationGranularity: input.preferences.locationGranularity,
      },
      occurredAt: now,
    });
  });

  return getSwipeRankPublication(input.tinderId, input.userId);
}

/**
 * Revocation deliberately needs only profile ownership. It must keep working if
 * an alias or optional publication preference is blank, stale, or otherwise no
 * longer valid. Rotating the internal key also severs any future public rows
 * from identifiers observed before revocation.
 */
export async function revokeSwipeRankPublication(input: {
  tinderId: string;
  userId: string;
}): Promise<SwipeRankPublicationState> {
  const owner = await getPublicationOwner(input.tinderId, input.userId);
  if (!owner) {
    throw new Error(
      "SwipeRank is not ready for this profile or the profile is not owned by this user.",
    );
  }

  await withTransaction(async (tx) => {
    const existing = await tx.query.swipeRankPublicationTable.findFirst({
      where: and(
        eq(swipeRankPublicationTable.profileId, owner.profileId),
        eq(swipeRankPublicationTable.userId, input.userId),
      ),
    });
    if (existing?.status !== "PUBLIC") return;

    const now = new Date();
    await tx
      .update(swipeRankPublicationTable)
      .set({
        userId: input.userId,
        publicKey: createId("rank"),
        status: "PRIVATE",
        consentedAt: null,
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(swipeRankPublicationTable.id, existing.id));

    await tx.insert(swipeRankPublicationEventTable).values({
      id: createId("srpe"),
      publicationId: existing.id,
      profileId: owner.profileId,
      userId: input.userId,
      eventType: "REVOKED",
      consentVersion: existing.consentVersion,
      explicitConsentReceived: false,
      preferences: {
        alias: existing.alias,
        showGender: existing.showGender,
        showAgeBand: existing.showAgeBand,
        showInterestedIn: existing.showInterestedIn,
        locationGranularity: existing.locationGranularity,
      },
      occurredAt: now,
    });
  });

  return getSwipeRankPublication(input.tinderId, input.userId);
}

function publicEntryKey(
  publicKey: string,
  period: SwipeRankPeriodBounds,
): string {
  const digest = createHash("sha256")
    .update(`${publicKey}:${period.kind}:${period.start}:${period.end}`)
    .digest("hex")
    .slice(0, 32);
  return `entry_${digest}`;
}

function locationLabel(row: PublicLeaderboardQueryRow): string | null {
  const values =
    row.location_granularity === "CITY"
      ? [row.city, row.region, row.country]
      : row.location_granularity === "REGION"
        ? [row.region, row.country]
        : row.location_granularity === "COUNTRY"
          ? [row.country]
          : [];
  const unique = [
    ...new Set(values.filter((value): value is string => !!value)),
  ];
  return unique.length > 0 ? unique.join(", ") : null;
}

export async function getPublicSwipeRankLeaderboard(input: {
  period: SwipeRankPeriodBounds;
  minimumRateDenominator: number;
  minimumActiveDays: number;
  limit: number;
  offset: number;
  metricVersion?: string;
}): Promise<PublicSwipeRankLeaderboard> {
  assertAlignedPeriod(input.period);
  assertPublicLeaderboardInput(input);
  const metricVersion = input.metricVersion ?? SWIPE_RANK_METRIC_VERSION;
  const result = await db.execute<PublicLeaderboardQueryRow>(sql`
    WITH eligible AS (
      SELECT
        fact.match_rate,
        fact.age_in_period,
        profile.id AS profile_id,
        profile.user_id AS profile_user_id,
        profile.gender,
        profile.interested_in,
        profile.city,
        profile.region,
        profile.country,
        build.completed_at AS build_completed_at,
        rank() OVER (ORDER BY fact.match_rate DESC) AS rank,
        count(*) OVER (PARTITION BY fact.match_rate) AS tie_count
      FROM swipe_rank_period_fact AS fact
      JOIN swipe_rank_profile AS profile ON profile.id = fact.profile_id
      JOIN swipe_rank_build AS build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      WHERE profile.data_provider = 'TINDER'
        AND profile.is_synthetic = false
        AND fact.metric_version = ${metricVersion}
        AND ${completedFullSwipeRankBuildSql("TINDER", metricVersion)}
        AND fact.period_kind = ${input.period.kind}
        AND fact.period_start = ${input.period.start}::date
        AND fact.period_end = ${input.period.end}::date
        AND fact.match_rate_denominator >= ${input.minimumRateDenominator}
        AND fact.active_days >= ${input.minimumActiveDays}
        AND fact.match_rate IS NOT NULL
    ), stats AS (
      SELECT
        ${completedFullSwipeRankBuildSql("TINDER", metricVersion)} AS ready,
        count(*)::bigint AS field_size,
        count(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM swipe_rank_publication AS publication
            WHERE publication.profile_id = eligible.profile_id
              AND publication.user_id = eligible.profile_user_id
              AND publication.status = 'PUBLIC'
          )
        )::bigint AS published_profiles,
        max(build_completed_at) AS as_of
      FROM eligible
    ), published AS (
      SELECT
        publication.public_key,
        publication.alias,
        publication.show_gender,
        publication.show_age_band,
        publication.show_interested_in,
        publication.location_granularity,
        eligible.*
      FROM eligible
      JOIN swipe_rank_publication AS publication
        ON publication.profile_id = eligible.profile_id
       AND publication.user_id = eligible.profile_user_id
       AND publication.status = 'PUBLIC'
      CROSS JOIN stats
      WHERE stats.field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
      ORDER BY eligible.rank, publication.public_key
      LIMIT ${input.limit}
      OFFSET ${input.offset}
    )
    SELECT
      stats.field_size,
      stats.ready,
      stats.published_profiles,
      stats.as_of,
      published.public_key,
      published.alias,
      published.rank,
      published.tie_count,
      published.match_rate AS metric_value,
      published.gender,
      published.interested_in,
      published.age_in_period,
      published.city,
      published.region,
      published.country,
      published.location_granularity,
      published.show_gender,
      published.show_age_band,
      published.show_interested_in
    FROM stats
    LEFT JOIN published ON true
    ORDER BY published.rank NULLS LAST, published.public_key
  `);
  const rows = result.rows;
  const first = rows[0];
  const fieldSize = first ? Number(first.field_size) : 0;
  const publishedProfiles = first ? Number(first.published_profiles) : 0;
  const countsSuppressed = fieldSize < SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE;
  const entries = !countsSuppressed
    ? rows.flatMap((row) => {
        if (
          row.public_key === null ||
          row.alias === null ||
          row.rank === null ||
          row.tie_count === null ||
          row.metric_value === null ||
          row.location_granularity === null
        ) {
          return [];
        }
        const rank = Number(row.rank);
        const age =
          row.age_in_period === null ? null : Number(row.age_in_period);
        return [
          {
            entryKey: publicEntryKey(row.public_key, input.period),
            alias: row.alias,
            rank,
            tieCount: Number(row.tie_count),
            fieldSize,
            percentile: ((fieldSize - rank + 1) / fieldSize) * 100,
            topShare: (rank / fieldSize) * 100,
            matchYieldPercent:
              Math.round(Number(row.metric_value) * 1_000) / 10,
            gender: row.show_gender ? row.gender : null,
            interestedIn: row.show_interested_in ? row.interested_in : null,
            ageBand: row.show_age_band ? getSwipeRankPublicAgeBand(age) : null,
            location: locationLabel(row),
          } satisfies PublicSwipeRankEntry,
        ];
      })
    : [];

  return {
    ready: first?.ready ?? false,
    metricVersion,
    period: input.period,
    asOf: iso(first?.as_of ?? null),
    minimumRateDenominator: input.minimumRateDenominator,
    minimumActiveDays: input.minimumActiveDays,
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    fieldSize: countsSuppressed ? null : fieldSize,
    publishedProfiles: countsSuppressed ? null : publishedProfiles,
    countsSuppressed,
    entries,
  };
}

/**
 * Public-safe period inventory. Periods below the minimum comparison field are
 * omitted; only aggregate counts are returned. Every observed useful period is
 * retained so the public experience can compare historical months, quarters,
 * and years rather than collapsing each cadence to its latest value.
 */
export async function listPublicSwipeRankPeriods(
  metricVersion = SWIPE_RANK_METRIC_VERSION,
): Promise<PublicSwipeRankPeriods> {
  const result = await db.execute<PublicPeriodSummaryRow>(sql`
    WITH period_facts AS (
      SELECT
        fact.period_kind,
        fact.period_start,
        fact.period_end,
        build.completed_at,
        (
          fact.match_rate IS NOT NULL
          AND fact.match_rate_denominator >= CASE fact.period_kind
            WHEN 'MONTH' THEN ${SWIPE_RANK_ELIGIBILITY_V1.MONTH.minimumRateDenominator}
            WHEN 'QUARTER' THEN ${SWIPE_RANK_ELIGIBILITY_V1.QUARTER.minimumRateDenominator}
            WHEN 'YEAR' THEN ${SWIPE_RANK_ELIGIBILITY_V1.YEAR.minimumRateDenominator}
            WHEN 'ALL_TIME' THEN ${SWIPE_RANK_ELIGIBILITY_V1.ALL_TIME.minimumRateDenominator}
          END::bigint
          AND fact.active_days >= CASE fact.period_kind
            WHEN 'MONTH' THEN ${SWIPE_RANK_ELIGIBILITY_V1.MONTH.minimumActiveDays}
            WHEN 'QUARTER' THEN ${SWIPE_RANK_ELIGIBILITY_V1.QUARTER.minimumActiveDays}
            WHEN 'YEAR' THEN ${SWIPE_RANK_ELIGIBILITY_V1.YEAR.minimumActiveDays}
            WHEN 'ALL_TIME' THEN ${SWIPE_RANK_ELIGIBILITY_V1.ALL_TIME.minimumActiveDays}
          END::integer
        ) AS is_eligible,
        publication.id IS NOT NULL AS is_published
      FROM swipe_rank_period_fact AS fact
      JOIN swipe_rank_profile AS profile ON profile.id = fact.profile_id
      JOIN swipe_rank_build AS build
        ON build.id = fact.build_id
       AND build.status = 'COMPLETE'
      LEFT JOIN swipe_rank_publication AS publication
        ON publication.profile_id = profile.id
       AND publication.user_id = profile.user_id
       AND publication.status = 'PUBLIC'
      WHERE profile.data_provider = 'TINDER'
        AND profile.is_synthetic = false
        AND fact.metric_version = ${metricVersion}
        AND ${completedFullSwipeRankBuildSql("TINDER", metricVersion)}
    ), summaries AS (
      SELECT
        period_kind,
        period_start,
        period_end,
        max(completed_at) FILTER (WHERE is_eligible) AS as_of,
        count(*) FILTER (WHERE is_eligible)::bigint AS field_size,
        count(*) FILTER (
          WHERE is_eligible AND is_published
        )::bigint AS published_profiles
      FROM period_facts
      GROUP BY period_kind, period_start, period_end
    ), useful AS (
      SELECT summaries.*
      FROM summaries
      WHERE field_size >= ${SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE}
    )
    SELECT
      period_kind,
      period_start::text,
      period_end::text,
      as_of,
      field_size,
      published_profiles
    FROM useful
    ORDER BY CASE period_kind
      WHEN 'MONTH' THEN 1
      WHEN 'QUARTER' THEN 2
      WHEN 'YEAR' THEN 3
      WHEN 'ALL_TIME' THEN 4
    END, period_start DESC, period_end DESC
  `);

  const periods = result.rows.map((row) => {
    const eligibility = SWIPE_RANK_ELIGIBILITY_V1[row.period_kind];
    return {
      period: {
        kind: row.period_kind,
        start: row.period_start,
        end: row.period_end,
      },
      asOf: iso(row.as_of)!,
      ...eligibility,
      fieldSize: Number(row.field_size),
      publishedProfiles: Number(row.published_profiles),
    } satisfies PublicSwipeRankPeriodSummary;
  });

  return {
    metricVersion,
    minimumPublicFieldSize: SWIPE_RANK_PUBLIC_MINIMUM_FIELD_SIZE,
    periods: SWIPE_RANK_PERIOD_KINDS.flatMap((kind) =>
      periods.filter((period) => period.period.kind === kind),
    ),
  };
}
