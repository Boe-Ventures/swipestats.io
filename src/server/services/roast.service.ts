import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { CohortStats, ProfileMeta } from "@/server/db/schema";
import { TONE_PERSONA, PROVIDER_NAME, type RoastTone } from "./roast-tone";

/** Sonnet writes sharper comedy and reasons about percentiles better than Haiku. */
export const STATS_ROAST_MODEL = "claude-sonnet-4-6";

const roastOutputSchema = z.object({
  tagline: z
    .string()
    .describe(
      "A short verdict badge, 2-5 words, capturing the overall read — e.g. 'Elite stats, zero follow-through' or 'Casanova in volume only'.",
    ),
  headline: z
    .string()
    .describe(
      "The single best one-liner from the roast — punchy, shareable, under 100 characters",
    ),
  verdict: z
    .string()
    .describe(
      "The overall take in 1-2 sentences MAX (~240 chars). Punchy, no rambling. This is the summary under the headline.",
    ),
  roastLines: z
    .array(z.string())
    .describe(
      "Exactly 5 (4-6 is fine) witty, data-driven roast lines about the user's dating app performance. Each a single punchy sentence under 140 characters. No two should make the same point.",
    ),
  realTalkInsights: z
    .array(z.string())
    .describe(
      "Exactly 3 genuine, actionable insights to actually improve their dating app game, most impactful first",
    ),
});

export type RoastOutput = z.infer<typeof roastOutputSchema>;

/**
 * One metric's standing vs the user's cohort. The roast uses these so it knows
 * what's actually good vs bad — otherwise it dunks on elite numbers as if they
 * were failures (e.g. a top-10% match rate read as "a coin flip").
 */
export interface RoastBenchmark {
  /** Human metric name, e.g. "Match rate". */
  label: string;
  /** Formatted value as shown to the user, e.g. "19.9%". */
  valueLabel: string;
  /** Where they land vs cohort, e.g. "top 10%" / "above the median" / "bottom 25%". */
  bucket: string;
  /** Who the cohort is, e.g. "men on Tinder". */
  cohortLabel: string;
}

export interface RoastInput {
  profileMeta: ProfileMeta;
  tone: RoastTone;
  gender?: string;
  dataProvider?: string;
  /** Cohort percentile context — when present, the roast is benchmark-aware. */
  benchmarks?: RoastBenchmark[];
}

/** Where a value lands in a P10–P90 distribution, as plain English. */
function percentileBucket(
  value: number,
  d: {
    p10: number | null;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
  },
): string | null {
  if (d.p50 == null) return null; // no usable distribution
  if (d.p90 != null && value >= d.p90) return "top 10%";
  if (d.p75 != null && value >= d.p75) return "top 25%";
  if (value >= d.p50) return "above the median (top half)";
  if (d.p25 != null && value >= d.p25) return "bottom half";
  return "bottom 25%";
}

/**
 * Turn a user's ProfileMeta + their cohort's percentile distribution into the
 * handful of benchmarks the roast cares about (match rate, like rate, activity).
 * Skips any metric the cohort has no distribution for.
 */
export function buildRoastBenchmarks(
  profileMeta: ProfileMeta,
  cohort: CohortStats,
  cohortLabel: string,
): RoastBenchmark[] {
  const out: RoastBenchmark[] = [];

  const matchBucket = percentileBucket(profileMeta.matchRate, {
    p10: cohort.matchRateP10,
    p25: cohort.matchRateP25,
    p50: cohort.matchRateP50,
    p75: cohort.matchRateP75,
    p90: cohort.matchRateP90,
  });
  if (matchBucket) {
    out.push({
      label: "Match rate",
      valueLabel: `${(profileMeta.matchRate * 100).toFixed(1)}%`,
      bucket: matchBucket,
      cohortLabel,
    });
  }

  const likeBucket = percentileBucket(profileMeta.likeRate, {
    p10: cohort.likeRateP10,
    p25: cohort.likeRateP25,
    p50: cohort.likeRateP50,
    p75: cohort.likeRateP75,
    p90: cohort.likeRateP90,
  });
  if (likeBucket) {
    out.push({
      label: "Like rate (how often they swipe right)",
      valueLabel: `${(profileMeta.likeRate * 100).toFixed(1)}%`,
      bucket: likeBucket,
      cohortLabel,
    });
  }

  const activityBucket = percentileBucket(profileMeta.swipesPerDay, {
    p10: cohort.swipesPerDayP10,
    p25: cohort.swipesPerDayP25,
    p50: cohort.swipesPerDayP50,
    p75: cohort.swipesPerDayP75,
    p90: cohort.swipesPerDayP90,
  });
  if (activityBucket) {
    out.push({
      label: "Swipes per active day",
      valueLabel: profileMeta.swipesPerDay.toFixed(1),
      bucket: activityBucket,
      cohortLabel,
    });
  }

  return out;
}

export async function generateRoast(input: RoastInput): Promise<RoastOutput> {
  const {
    profileMeta,
    tone,
    gender,
    dataProvider = "TINDER",
    benchmarks = [],
  } = input;

  const providerName = PROVIDER_NAME[dataProvider] ?? dataProvider;

  const matchRatePct = (profileMeta.matchRate * 100).toFixed(1);
  const likeRatePct = (profileMeta.likeRate * 100).toFixed(1);
  const ghostRatePct =
    profileMeta.conversationCount > 0
      ? (
          (profileMeta.ghostedCount / profileMeta.conversationCount) *
          100
        ).toFixed(1)
      : "0";
  const totalSwipes =
    profileMeta.swipeLikesTotal + profileMeta.swipePassesTotal;

  const benchmarkBlock =
    benchmarks.length > 0
      ? `\nHOW THEY RANK vs other ${benchmarks[0]!.cohortLabel} (this is the truth — respect it):
${benchmarks
  .map((b) => `- ${b.label}: ${b.valueLabel} — ${b.bucket} of their cohort`)
  .join("\n")}

CRITICAL: do NOT roast strong numbers as if they were bad. A top-10%/top-25% stat is genuinely impressive — acknowledge it. The funniest, sharpest roast targets the CONTRADICTIONS (e.g. elite match rate but ghosts most matches; tons of matches but barely messages), not the good stats themselves.`
      : `\n(No cohort benchmark available — judge the numbers on their own merits and avoid assuming a number is "bad" without context.)`;

  const prompt = `You are ${TONE_PERSONA[tone]}

You have someone's ${providerName} dating app statistics and your job is to roast them — data-driven and punchy.

Here are their stats:
- Total swipes: ${totalSwipes.toLocaleString()} (${profileMeta.swipeLikesTotal.toLocaleString()} likes, ${profileMeta.swipePassesTotal.toLocaleString()} passes)
- Like rate (how often they swipe right): ${likeRatePct}%
- Match rate (matches per like sent): ${matchRatePct}%
- Total matches: ${profileMeta.matchesTotal.toLocaleString()}
- Days active on app: ${profileMeta.daysActive}
- Swipes per active day: ${profileMeta.swipesPerDay.toFixed(1)}
- Total app opens: ${profileMeta.appOpensTotal.toLocaleString()}
- Messages sent: ${profileMeta.messagesSentTotal.toLocaleString()}
- Messages received: ${profileMeta.messagesReceivedTotal.toLocaleString()}
- Conversations started: ${profileMeta.conversationsWithMessages}
- Ghosted matches (no messages ever): ${profileMeta.ghostedCount} (${ghostRatePct}% ghost rate)
- Avg messages per conversation: ${profileMeta.averageMessagesPerConversation?.toFixed(1) ?? "N/A"}
${gender ? `- Gender: ${gender}` : ""}
${benchmarkBlock}

Roast rules:
1. Reference specific numbers — that's what makes it land
2. Draw absurd but accurate conclusions from the data
3. Compare to relatable everyday things (e.g., "you've spent more time on ${providerName} than...")
4. Keep each line to ONE punchy sentence under 140 characters — no rambling
5. Vary the angle across the lines (pickiness, match rate, ghosting, app addiction, messaging)
6. Make the headline the single sharpest, most shareable line

For the "Real Talk" insights, be genuinely helpful — what would actually move the needle for someone with these stats and this ranking?`;

  try {
    const { output } = await generateText({
      model: anthropic(STATS_ROAST_MODEL),
      temperature: 0.9,
      output: Output.object({
        name: "DatingStatsRoast",
        description:
          "A punchy, data-driven roast of someone's dating-app stats: a score, a one-line verdict, roast lines, and real-talk tips.",
        schema: roastOutputSchema,
      }),
      prompt,
    });

    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("[roast] stats roast: no object generated", {
        cause: error.cause,
        text: error.text,
      });
    }
    throw error;
  }
}
