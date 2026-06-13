import { Card, CardContent } from "@/components/ui/card";
import {
  TRACKING_PLAN,
  type AnalyticsDestination,
  type EventStatus,
  type EventSurface,
  type TrackingPlanEntry,
} from "@/lib/analytics/analytics.registry";

const statusStyles: Record<EventStatus, string> = {
  live: "bg-green-100 text-green-800",
  planned: "bg-amber-100 text-amber-800",
  deprecated: "bg-gray-200 text-gray-600",
};

const destStyles: Record<AnalyticsDestination, string> = {
  posthog: "bg-blue-100 text-blue-700",
  vercel: "bg-gray-900 text-white",
  slack: "bg-purple-100 text-purple-700",
  amplitude: "bg-sky-100 text-sky-700",
};

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function DestinationBadges({
  destinations,
}: {
  destinations: AnalyticsDestination[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {destinations.map((d) => (
        <span
          key={d}
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${destStyles[d]}`}
        >
          {d}
        </span>
      ))}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  );
}

/** Preserve registry order while grouping by category. */
function groupByCategory(entries: TrackingPlanEntry[]) {
  const groups = new Map<string, TrackingPlanEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.category) ?? [];
    bucket.push(entry);
    groups.set(entry.category, bucket);
  }
  return [...groups.entries()];
}

function SurfaceSection({
  surface,
  entries,
}: {
  surface: EventSurface;
  entries: TrackingPlanEntry[];
}) {
  const grouped = groupByCategory(entries);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        {surface === "server" ? "Server events" : "Client events"}
        <span className="ml-2 text-sm font-normal text-gray-500">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </span>
      </h2>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Destinations</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.map(([category, rows]) => (
                <CategoryRows
                  key={category}
                  category={category}
                  rows={rows}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryRows({
  category,
  rows,
}: {
  category: string;
  rows: TrackingPlanEntry[];
}) {
  return (
    <>
      <tr className="bg-gray-50/60">
        <td
          colSpan={4}
          className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          {category}
        </td>
      </tr>
      {rows.map((entry) => (
        <tr key={entry.name} className="align-top">
          <td className="px-4 py-2 font-mono text-xs text-gray-900">
            {entry.name}
          </td>
          <td className="px-4 py-2">
            <StatusBadge status={entry.status} />
          </td>
          <td className="px-4 py-2">
            <DestinationBadges destinations={entry.destinations} />
          </td>
          <td className="px-4 py-2 text-gray-600">{entry.description}</td>
        </tr>
      ))}
    </>
  );
}

export default function TrackingPlanPage() {
  const serverEvents = TRACKING_PLAN.filter((e) => e.surface === "server");
  const clientEvents = TRACKING_PLAN.filter((e) => e.surface === "client");
  const liveCount = TRACKING_PLAN.filter((e) => e.status === "live").length;
  const plannedCount = TRACKING_PLAN.filter(
    (e) => e.status === "planned",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tracking Plan</h1>
        <p className="mt-2 text-gray-600">
          The single source of truth for analytics events, pinned to the typed
          taxonomy in{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
            analytics.types.ts
          </code>
          . Status is a manual declaration of code coverage — live PostHog
          cross-reference is a future step.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label="Total events" value={TRACKING_PLAN.length} />
        <SummaryStat label="Live" value={liveCount} />
        <SummaryStat label="Planned" value={plannedCount} />
        <SummaryStat
          label="Server / Client"
          value={serverEvents.length}
        />
      </div>

      <SurfaceSection surface="server" entries={serverEvents} />
      <SurfaceSection surface="client" entries={clientEvents} />
    </div>
  );
}
