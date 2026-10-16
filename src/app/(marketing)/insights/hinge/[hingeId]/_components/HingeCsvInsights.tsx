"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  HingeCsvSummary,
  HingeCsvKind,
  HingeCsvTable,
} from "@/lib/hinge/csv-activity";

const series = [
  { key: "LIKE", label: "Likes", color: "#8b5cf6" },
  { key: "ROSE", label: "Roses", color: "#ec4899" },
  { key: "SKIP", label: "Skips", color: "#94a3b8" },
  { key: "BLOCK", label: "Blocks", color: "#f59e0b" },
  { key: "MESSAGE_SENT", label: "Messages sent", color: "#10b981" },
  { key: "VOICE_NOTE_SENT", label: "Voice notes sent", color: "#06b6d4" },
  {
    key: "MESSAGE_RECEIVED",
    label: "Recorded received messages",
    color: "#3b82f6",
  },
  {
    key: "VOICE_NOTE_RECEIVED",
    label: "Recorded received voice notes",
    color: "#6366f1",
  },
] satisfies { key: HingeCsvKind; label: string; color: string }[];
const tableByKind: Record<HingeCsvKind, HingeCsvTable> = {
  LIKE: "match_likes",
  ROSE: "match_roses",
  SKIP: "match_skips",
  BLOCK: "match_blocks",
  MESSAGE_SENT: "chat_message",
  MESSAGE_RECEIVED: "chat_message",
  VOICE_NOTE_SENT: "chat_voice_note",
  VOICE_NOTE_RECEIVED: "chat_voice_note",
};

export function HingeCsvInsights({
  summary,
  preview = false,
}: {
  summary: HingeCsvSummary;
  preview?: boolean;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const daily = useMemo(
    () =>
      summary.daily.filter(
        (day) => (!start || day.date >= start) && (!end || day.date <= end),
      ),
    [summary, start, end],
  );
  const monthly = useMemo(() => {
    const months = new Map<string, Record<string, string | number>>();
    for (const day of daily) {
      const month = day.date.slice(0, 7);
      const row = months.get(month) ?? { month };
      for (const { key } of series) row[key] = Number(row[key] ?? 0) + day[key];
      months.set(month, row);
    }
    return [...months.values()];
  }, [daily]);
  const visibleSeries = series.filter(({ key }) =>
    key.includes("RECEIVED")
      ? summary.counts[key] > 0
      : key === "VOICE_NOTE_SENT"
        ? summary.tables.includes("chat_voice_note")
        : true,
  );
  const middle = Math.floor(summary.conversationSizes.length / 2);
  const medianConversationSize =
    summary.conversationSizes.length % 2
      ? summary.conversationSizes[middle]
      : ((summary.conversationSizes[middle - 1] ?? 0) +
          (summary.conversationSizes[middle] ?? 0)) /
        2;
  const cards = [
    ...visibleSeries.map(({ key, label }) => ({
      label,
      value: daily.reduce((n, day) => n + day[key], 0),
      available: summary.tables.includes(tableByKind[key]),
    })),
    {
      label: "Conversations with recorded messages",
      value: summary.conversations,
      available:
        summary.tables.includes("chat_message") ||
        summary.tables.includes("chat_voice_note"),
    },
  ];
  return (
    <section className="space-y-6">
      <div className="bg-card rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Your recorded Hinge activity</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Explore your likes, skips, and messaging activity. This export does
          not include match dates, so total matches, match conversion, and reply
          rates are N/A.
        </p>
        <details className="text-muted-foreground mt-3 text-sm">
          <summary className="cursor-pointer">What these numbers mean</summary>
          <p className="mt-2">
            Counts reflect the records Hinge provided across your CSV uploads.
            Missing tables show N/A. Conversations with recorded messages are
            not a complete count of matches. Incoming likes and time to match
            are unavailable. Blocks do not distinguish rejects from unmatches.
            Counts are separate from older JSON history to avoid double
            counting.
          </p>
        </details>
      </div>
      {!preview && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            From (UTC)
            <input
              aria-label="Activity start date"
              className="bg-background mt-1 block rounded-md border p-2"
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Through (UTC)
            <input
              aria-label="Activity end date"
              className="bg-background mt-1 block rounded-md border p-2"
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button
            className="p-2 text-sm underline"
            onClick={() => {
              setStart("");
              setEnd("");
            }}
          >
            All dates
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <div className="bg-card rounded-xl border p-4" key={card.label}>
            <p className="text-muted-foreground text-sm">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {card.available ? card.value.toLocaleString() : "N/A"}
            </p>
            {card.label.startsWith("Conversations") && (
              <p className="text-muted-foreground mt-1 text-xs">
                All retained CSV dates
              </p>
            )}
          </div>
        ))}
      </div>
      {!preview && (
        <>
          <div className="bg-card rounded-xl border p-5">
            <h3 className="mb-4 font-semibold">Activity by month (UTC)</h3>
            {monthly.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--border)",
                      }}
                    />
                    {visibleSeries.map(({ key, label, color }) => (
                      <Bar key={key} dataKey={key} name={label} fill={color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recorded activity in this date range.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {visibleSeries.map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-card grid gap-6 rounded-xl border p-5 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-sm">
                Days with recorded activity
              </p>
              <p className="text-xl font-semibold">
                {daily.length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                Average sent message length, all dates
              </p>
              <p className="text-xl font-semibold">
                {summary.counts.MESSAGE_SENT
                  ? `${Math.round(summary.charactersSent / summary.counts.MESSAGE_SENT)} characters`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                Likes with comments, all dates
              </p>
              <p className="text-xl font-semibold">
                {summary.tables.includes("match_likes")
                  ? summary.likesWithComments.toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
          {summary.conversationSizes.length > 0 && (
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold">
                Recorded conversation activity, all dates
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Your largest recorded conversation contains{" "}
                {summary.conversationSizes[0]!.toLocaleString()} messages and
                voice notes. The median is{" "}
                {medianConversationSize?.toLocaleString()} per conversation.
                These measure exported activity, not replies or full
                conversation length.
              </p>
            </div>
          )}
          <p className="text-muted-foreground text-sm">
            Hinge may export only part of your conversation history. Only the
            directions explicitly present in your files are counted; absence of
            received messages does not mean nobody replied. Voice notes are
            stored separately from text messages.
          </p>
        </>
      )}
    </section>
  );
}
