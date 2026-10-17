"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { getProfileColor } from "@/lib/charts/profile-colors";
import {
  buildHingeComparisonTimeline,
  HINGE_COMPARISON_METRICS,
  type HingeComparisonProfile,
  type HingeComparisonMetric,
  type HingeComparisonGranularity,
} from "@/lib/hinge/comparison";

export function HingeComparisonView({
  profiles,
  baseId,
  baseIsOwner = false,
  order = profiles.map((p) => p.hingeId),
}: {
  profiles: HingeComparisonProfile[];
  baseId: string;
  baseIsOwner?: boolean;
  order?: string[];
}) {
  const [metric, setMetric] = useState<HingeComparisonMetric>("messagesSent");
  const [granularity, setGranularity] =
    useState<HingeComparisonGranularity>("monthly");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const timeline = useMemo(
    () =>
      buildHingeComparisonTimeline(
        profiles,
        metric,
        granularity,
        from,
        through,
      ),
    [profiles, metric, granularity, from, through],
  );
  const index = (id: string) => Math.max(0, order.indexOf(id));
  const label = (id: string) =>
    id === baseId
      ? baseIsOwner
        ? "You"
        : "Base profile"
      : `Profile ${index(id) + 1}`;
  const formatPeriod = (time: number) =>
    new Date(time).toISOString().slice(0, granularity === "monthly" ? 7 : 10);
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-5 text-sm">
        <p>
          Each profile keeps its actual calendar dates. The chart spans the
          earliest export start through the latest export end. Gaps outside a
          profile&apos;s export period mean no coverage, while zero inside it
          means no recorded events for that bucket.
        </p>
        <p className="text-muted-foreground mt-2">
          Counts describe exported records, which may be incomplete. Match
          conversion and reply rates are unavailable across these formats.
          Subscription and other private life events are excluded from
          comparisons.
        </p>
      </div>
      <section className="bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {HINGE_COMPARISON_METRICS[metric].label}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {HINGE_COMPARISON_METRICS[metric].description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Metric
              <select
                className="bg-background mt-1 block rounded-md border p-2"
                value={metric}
                onChange={(event) =>
                  setMetric(event.target.value as HingeComparisonMetric)
                }
              >
                {Object.entries(HINGE_COMPARISON_METRICS).map(
                  ([key, config]) => (
                    <option value={key} key={key}>
                      {config.label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm">
              Group by
              <select
                className="bg-background mt-1 block rounded-md border p-2"
                value={granularity}
                onChange={(event) =>
                  setGranularity(
                    event.target.value as HingeComparisonGranularity,
                  )
                }
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </label>
          </div>
        </div>
        <div className="my-5 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            From (UTC)
            <input
              className="bg-background mt-1 block rounded-md border p-2"
              type="date"
              value={from}
              max={through || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Through (UTC)
            <input
              className="bg-background mt-1 block rounded-md border p-2"
              type="date"
              value={through}
              min={from || undefined}
              onChange={(event) => setThrough(event.target.value)}
            />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              setFrom("");
              setThrough("");
            }}
          >
            Full calendar period
          </Button>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.hingeId}
              aria-pressed={!hidden.has(profile.hingeId)}
              className={`rounded-full border px-4 py-2 text-sm ${hidden.has(profile.hingeId) ? "opacity-45" : ""}`}
              style={{ borderColor: getProfileColor(index(profile.hingeId)) }}
              onClick={() =>
                setHidden((previous) => {
                  const next = new Set(previous);
                  if (next.has(profile.hingeId)) next.delete(profile.hingeId);
                  else next.add(profile.hingeId);
                  return next;
                })
              }
            >
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getProfileColor(index(profile.hingeId)),
                }}
              />
              {label(profile.hingeId)} ·{" "}
              {timeline.totals[profile.hingeId]?.toLocaleString() ?? "N/A"}
            </button>
          ))}
        </div>
        {!!profiles.find((profile) => !profile.available[metric]) && (
          <p className="text-muted-foreground mb-4 text-sm">
            N/A means this metric is not supplied by that export. It is never
            plotted as zero.
          </p>
        )}
        {timeline.data.length ? (
          <div className="h-80 min-w-0 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline.data}
                margin={{ top: 10, right: 15, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={timeline.domain}
                  tickFormatter={formatPeriod}
                  minTickGap={45}
                />
                <YAxis allowDecimals={false} width={45} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const entry = payload[0] as { payload?: unknown };
                    const row = entry.payload as {
                      date: string;
                    } & Record<string, number | string | null>;
                    return (
                      <div className="bg-background rounded-lg border p-3 text-sm shadow-lg">
                        <p className="mb-2 font-medium">{row.date}</p>
                        {profiles
                          .filter((profile) => !hidden.has(profile.hingeId))
                          .map((profile) => (
                            <p
                              key={profile.hingeId}
                              style={{
                                color: getProfileColor(index(profile.hingeId)),
                              }}
                            >
                              {label(profile.hingeId)}:{" "}
                              {!profile.available[metric]
                                ? "Not in export"
                                : row[profile.hingeId] === null
                                  ? "Outside export period"
                                  : Number(
                                      row[profile.hingeId],
                                    ).toLocaleString()}
                            </p>
                          ))}
                      </div>
                    );
                  }}
                />
                {profiles
                  .filter(
                    (profile) =>
                      !hidden.has(profile.hingeId) && profile.available[metric],
                  )
                  .map((profile) => (
                    <Line
                      key={profile.hingeId}
                      name={label(profile.hingeId)}
                      dataKey={profile.hingeId}
                      stroke={getProfileColor(index(profile.hingeId))}
                      strokeWidth={2}
                      type="linear"
                      connectNulls={false}
                      dot={
                        timeline.data.filter(
                          (row) => row[profile.hingeId] !== null,
                        ).length === 1
                          ? { r: 3 }
                          : false
                      }
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground py-12 text-center">
            No data in this date range. Select a shorter range or a coarser
            grouping for very long histories.
          </p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((profile) => (
          <article
            className="bg-card space-y-3 rounded-xl border p-5"
            key={profile.hingeId}
            style={{
              borderTopColor: getProfileColor(index(profile.hingeId)),
              borderTopWidth: 3,
            }}
          >
            <h3 className="font-semibold">{label(profile.hingeId)}</h3>
            <p className="text-muted-foreground text-sm">
              {profile.format} export
              <br />
              {profile.from ?? "N/A"} to {profile.to ?? "N/A"}
            </p>
            <p className="text-sm">
              Selected {HINGE_COMPARISON_METRICS[metric].label.toLowerCase()}:{" "}
              <strong>
                {timeline.totals[profile.hingeId]?.toLocaleString() ?? "N/A"}
              </strong>
            </p>
            <p className="text-muted-foreground text-xs">
              Conversation sizes reflect retained outgoing messages, not full
              two-sided conversations.
            </p>
            <p className="text-sm">
              All-time median recorded messages per messaged conversation:{" "}
              <strong>
                {profile.conversationSizes.length
                  ? median(profile.conversationSizes)
                  : "N/A"}
              </strong>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
function median(values: number[]) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2
    ? values[middle]
    : ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2;
}
