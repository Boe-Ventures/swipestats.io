import type { HingeCsvActivity } from "./csv-activity";

export const HINGE_COMPARISON_METRICS = {
  messagesSent: {
    label: "Sent messages",
    description: "Recorded outgoing text messages and voice notes",
  },
  conversations: {
    label: "Messaged conversations",
    description:
      "Conversations first observed with an outgoing message in this period",
  },
  likes: {
    label: "Recorded likes",
    description:
      "Sent-like records; older JSON exports do not distinguish roses",
  },
  matches: {
    label: "Matches",
    description: "Explicit match events, available in older JSON exports",
  },
  skips: {
    label: "Skips",
    description: "Recorded skips, available in CSV exports",
  },
  roses: {
    label: "Roses",
    description: "Recorded roses, available separately in CSV exports",
  },
} as const;
export type HingeComparisonMetric = keyof typeof HINGE_COMPARISON_METRICS;
const metrics = Object.keys(
  HINGE_COMPARISON_METRICS,
) as HingeComparisonMetric[];
const empty = () =>
  Object.fromEntries(metrics.map((key) => [key, 0])) as Record<
    HingeComparisonMetric,
    number
  >;
export type HingeComparisonDay = { date: string } & Record<
  HingeComparisonMetric,
  number
>;
export interface HingeComparisonProfile {
  hingeId: string;
  format: "CSV" | "JSON";
  from: string | null;
  to: string | null;
  available: Record<HingeComparisonMetric, boolean>;
  daily: HingeComparisonDay[];
  conversationSizes: number[];
}
export interface HingeComparisonSource {
  hingeId: string;
  createDate: Date;
  firstAccountCreateDate: Date | null;
  lastSeenAt: Date | null;
  csvActivity: HingeCsvActivity | null;
  matches: { matchedAt: Date | null; messages: { sentDate: Date }[] }[];
  interactions: { type: string; timestamp: Date }[];
}

/** Recompute from observed records. Stored legacy profile_meta may predate
 * corrected semantics and must not supply comparison rates or active days. */
export function normalizeHingeComparison(
  source: HingeComparisonSource,
): HingeComparisonProfile {
  const days = new Map<string, Record<HingeComparisonMetric, number>>();
  const record = (at: Date | string, metric: HingeComparisonMetric) => {
    const date = new Date(at).toISOString().slice(0, 10);
    const day = days.get(date) ?? empty();
    day[metric]++;
    days.set(date, day);
  };
  const csv = source.csvActivity;
  const available: Record<HingeComparisonMetric, boolean> = csv
    ? {
        messagesSent:
          csv.tables.includes("chat_message") ||
          csv.tables.includes("chat_voice_note"),
        conversations:
          csv.tables.includes("chat_message") ||
          csv.tables.includes("chat_voice_note"),
        likes: csv.tables.includes("match_likes"),
        matches: false,
        skips: csv.tables.includes("match_skips"),
        roses: csv.tables.includes("match_roses"),
      }
    : {
        messagesSent: true,
        conversations: true,
        likes: true,
        matches: true,
        skips: false,
        roses: false,
      };
  const conversationSizes: number[] = [];
  if (csv) {
    const conversations = new Map<string, { first: string; count: number }>();
    for (const event of csv.events) {
      if (event.kind === "LIKE") record(event.timestamp, "likes");
      if (event.kind === "ROSE") record(event.timestamp, "roses");
      if (event.kind === "SKIP") record(event.timestamp, "skips");
      if (event.kind === "MESSAGE_SENT" || event.kind === "VOICE_NOTE_SENT") {
        record(event.timestamp, "messagesSent");
        const id = event.conversationId!;
        const previous = conversations.get(id);
        conversations.set(id, {
          first:
            previous && previous.first < event.timestamp
              ? previous.first
              : event.timestamp,
          count: (previous?.count ?? 0) + 1,
        });
      }
    }
    for (const conversation of conversations.values()) {
      record(conversation.first, "conversations");
      conversationSizes.push(conversation.count);
    }
  } else {
    for (const match of source.matches) {
      if (match.matchedAt) record(match.matchedAt, "matches");
      const sent = match.messages
        .map((message) => message.sentDate)
        .sort((a, b) => a.getTime() - b.getTime());
      for (const at of sent) record(at, "messagesSent");
      if (sent.length) {
        record(sent[0]!, "conversations");
        conversationSizes.push(sent.length);
      }
    }
    for (const interaction of source.interactions)
      if (interaction.type === "LIKE_SENT")
        record(interaction.timestamp, "likes");
  }
  const daily = [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
  const start = [
    source.firstAccountCreateDate ?? source.createDate,
    source.createDate,
    ...(daily[0] ? [new Date(daily[0].date)] : []),
  ].map((date) => date.getTime());
  const end = [
    source.lastSeenAt ?? source.createDate,
    ...(daily.at(-1) ? [new Date(daily.at(-1)!.date)] : []),
  ].map((date) => date.getTime());
  // Only this aggregate projection leaves the server. Never include message
  // content, conversation IDs, account identity fields, or private life events.
  return {
    hingeId: source.hingeId,
    format: csv ? "CSV" : "JSON",
    from: new Date(Math.min(...start)).toISOString().slice(0, 10),
    to: new Date(Math.max(...end)).toISOString().slice(0, 10),
    available,
    daily,
    conversationSizes: conversationSizes.sort((a, b) => a - b),
  };
}
const DAY = 86_400_000;
export type HingeComparisonGranularity = "daily" | "weekly" | "monthly";
function bucket(at: number, granularity: HingeComparisonGranularity) {
  const d = new Date(at);
  if (granularity === "monthly")
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return granularity === "weekly" ? day - ((d.getUTCDay() + 6) % 7) * DAY : day;
}
function next(at: number, granularity: HingeComparisonGranularity) {
  const d = new Date(at);
  return granularity === "monthly"
    ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    : at + (granularity === "weekly" ? 7 : 1) * DAY;
}
export function buildHingeComparisonTimeline(
  profiles: HingeComparisonProfile[],
  metric: HingeComparisonMetric,
  granularity: HingeComparisonGranularity = "monthly",
  from = "",
  through = "",
) {
  const ranged = profiles.filter((p) => p.from && p.to);
  if (!ranged.length)
    return {
      data: [],
      domain: [0, 1] as [number, number],
      totals: {} as Record<string, number | null>,
    };
  const min = from
    ? Date.parse(from)
    : Math.min(...ranged.map((p) => Date.parse(p.from!)));
  const max = through
    ? Date.parse(through) + DAY
    : Math.max(...ranged.map((p) => Date.parse(p.to!))) + DAY;
  if (max <= min || !Number.isFinite(min) || !Number.isFinite(max))
    return {
      data: [],
      domain: [0, 1] as [number, number],
      totals: {} as Record<string, number | null>,
    };
  const values = new Map<string, Map<number, number>>();
  const totals: Record<string, number | null> = {};
  for (const profile of profiles) {
    const sums = new Map<number, number>();
    totals[profile.hingeId] = profile.available[metric] ? 0 : null;
    for (const day of profile.daily) {
      const at = Date.parse(day.date);
      if (at < min || at >= max) continue;
      const key = bucket(at, granularity);
      sums.set(key, (sums.get(key) ?? 0) + day[metric]);
      if (profile.available[metric])
        totals[profile.hingeId] = (totals[profile.hingeId] ?? 0) + day[metric];
    }
    values.set(profile.hingeId, sums);
  }
  const data: ({ timestamp: number; date: string } & Record<
    string,
    number | string | null
  >)[] = [];
  for (
    let at = bucket(min, granularity);
    at < max;
    at = next(at, granularity)
  ) {
    // Never silently truncate the shared calendar.
    if (data.length >= 5000)
      return { data: [], domain: [min, max] as [number, number], totals };
    const finish = next(at, granularity);
    const row: { timestamp: number; date: string } & Record<
      string,
      number | string | null
    > = {
      timestamp: (Math.max(at, min) + Math.min(finish, max)) / 2,
      date: new Date(at).toISOString().slice(0, 10),
    };
    for (const profile of profiles) {
      const covered =
        profile.from &&
        profile.to &&
        Date.parse(profile.from) < Math.min(finish, max) &&
        Date.parse(profile.to) + DAY > Math.max(at, min);
      row[profile.hingeId] =
        profile.available[metric] && covered
          ? (values.get(profile.hingeId)?.get(at) ?? 0)
          : null;
    }
    data.push(row);
  }
  return { data, domain: [min, max] as [number, number], totals };
}
