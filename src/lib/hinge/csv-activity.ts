import { z } from "zod";
import { isProviderTimestamp } from "@/lib/upload/provider-boundary-validation";

export const HINGE_CSV_TABLES = [
  "user",
  "registration",
  "chat_message",
  "chat_voice_note",
  "match_likes",
  "match_roses",
  "match_skips",
  "match_blocks",
  "profile_prompt_answers",
  "profile_prompt_polls",
  "user_media",
  "store_subscription_purchases",
] as const;
export type HingeCsvTable = (typeof HINGE_CSV_TABLES)[number];
export const HINGE_CSV_ACTIVITY_TABLES = [
  "chat_message",
  "chat_voice_note",
  "match_likes",
  "match_roses",
  "match_skips",
  "match_blocks",
] as const;
export const HINGE_CSV_KINDS = [
  "LIKE",
  "ROSE",
  "SKIP",
  "BLOCK",
  "MESSAGE_SENT",
  "MESSAGE_RECEIVED",
  "VOICE_NOTE_SENT",
  "VOICE_NOTE_RECEIVED",
] as const;
export type HingeCsvKind = (typeof HINGE_CSV_KINDS)[number];
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const hingeSubscriptionPeriodSchema = z
  .object({
    id: digest,
    startAt: z.string().refine((value) => isProviderTimestamp(value)),
    endAt: z
      .string()
      .refine((value) => isProviderTimestamp(value, { allowFuture: true })),
    observedAt: z.string().refine((value) => isProviderTimestamp(value)),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.endAt).getTime() > new Date(value.startAt).getTime(),
    "Subscription end must follow start",
  );
export type HingeSubscriptionPeriod = z.infer<
  typeof hingeSubscriptionPeriodSchema
>;

export const hingeCsvActivitySchema = z
  .object({
    version: z.literal(1),
    subscriptions: z
      .array(hingeSubscriptionPeriodSchema)
      .max(10_000)
      .optional(),
    tables: z.array(z.enum(HINGE_CSV_TABLES)).max(HINGE_CSV_TABLES.length),
    events: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-f0-9]{64}:\d+$/),
            kind: z.enum(HINGE_CSV_KINDS),
            timestamp: z.string().refine((v) => isProviderTimestamp(v)),
            conversationId: digest.optional(),
            charCount: z.number().int().min(0).max(10_000_000).optional(),
            hasComment: z.boolean().optional(),
          })
          .strict(),
      )
      .max(500_000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    for (const [index, event] of value.events.entries()) {
      if (ids.has(event.id))
        ctx.addIssue({
          code: "custom",
          path: ["events", index, "id"],
          message: "Duplicate activity identity",
        });
      ids.add(event.id);
      if (
        (event.kind.startsWith("MESSAGE_") ||
          event.kind.startsWith("VOICE_NOTE_")) &&
        !event.conversationId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["events", index],
          message: "Message requires an anonymized conversation identity",
        });
      }
    }
  });
export type HingeCsvActivity = z.infer<typeof hingeCsvActivitySchema>;

/** CSV rows have no event IDs. Extraction numbers identical occurrences; union
 * keeps the maximum observed multiplicity, including on narrower reuploads. */
export function mergeHingeCsvActivity(
  retained: HingeCsvActivity | null | undefined,
  incoming: HingeCsvActivity | null | undefined,
): HingeCsvActivity | null {
  if (!incoming) return retained ?? null;
  if (!retained) return incoming;
  const events = new Map(retained.events.map((event) => [event.id, event]));
  for (const event of incoming.events)
    if (!events.has(event.id)) events.set(event.id, event);
  return {
    version: 1,
    tables: [...new Set([...retained.tables, ...incoming.tables])],
    ...(retained.subscriptions || incoming.subscriptions
      ? {
          subscriptions: mergeHingeSubscriptions(
            retained.subscriptions,
            incoming.subscriptions,
          ),
        }
      : {}),
    events: [...events.values()].sort(
      (a, b) =>
        a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
    ),
  };
}

/** Later transactions can correct a previously exported subscription end. */
export function mergeHingeSubscriptions(
  retained: HingeSubscriptionPeriod[] = [],
  incoming: HingeSubscriptionPeriod[] = [],
) {
  const periods = new Map(retained.map((period) => [period.id, period]));
  for (const period of incoming) {
    const previous = periods.get(period.id);
    if (
      !previous ||
      new Date(period.observedAt).getTime() >
        new Date(previous.observedAt).getTime()
    )
      periods.set(period.id, period);
    else if (
      period.observedAt === previous.observedAt &&
      period.endAt !== previous.endAt
    )
      throw new Error("Conflicting subscription observations.");
  }
  return [...periods.values()].sort(
    (a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id),
  );
}

/** Public projection: no content, event IDs, or hashed conversation IDs. */
export function summarizeHingeCsvActivity(activity: HingeCsvActivity) {
  const counts = Object.fromEntries(
    HINGE_CSV_KINDS.map((kind) => [kind, 0]),
  ) as Record<HingeCsvKind, number>;
  const daily = new Map<string, Record<HingeCsvKind, number>>();
  const conversations = new Map<string, number>();
  let charactersSent = 0;
  let likesWithComments = 0;
  for (const event of activity.events) {
    counts[event.kind]++;
    const day = new Date(event.timestamp).toISOString().slice(0, 10);
    const bucket =
      daily.get(day) ??
      (Object.fromEntries(HINGE_CSV_KINDS.map((kind) => [kind, 0])) as Record<
        HingeCsvKind,
        number
      >);
    bucket[event.kind]++;
    daily.set(day, bucket);
    if (event.conversationId)
      conversations.set(
        event.conversationId,
        (conversations.get(event.conversationId) ?? 0) + 1,
      );
    if (event.kind === "MESSAGE_SENT") charactersSent += event.charCount ?? 0;
    if (event.kind === "LIKE" && event.hasComment) likesWithComments++;
  }
  return {
    counts,
    tables: activity.tables,
    activeDays: daily.size,
    daily: [...daily]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts })),
    conversations: conversations.size,
    conversationSizes: [...conversations.values()].sort((a, b) => b - a),
    charactersSent,
    likesWithComments,
  };
}
export type HingeCsvSummary = ReturnType<typeof summarizeHingeCsvActivity>;

/** Counts added by this upload, not a claim about missing provider match data. */
export function hingeCsvUploadMetrics(
  incoming: HingeCsvActivity | undefined,
  retained?: HingeCsvActivity | null,
) {
  if (!incoming) return {};
  const ids = new Set(retained?.events.map((event) => event.id));
  const added = incoming.events.filter((event) => !ids.has(event.id));
  return {
    matchCount: null,
    messageCount: added.filter(
      (event) =>
        event.kind === "MESSAGE_SENT" || event.kind === "VOICE_NOTE_SENT",
    ).length,
    interactionCount: added.length,
  };
}
