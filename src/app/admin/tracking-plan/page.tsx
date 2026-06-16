"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  TRACKING_PLAN,
  type AnalyticsDestination,
  type EventStatus,
  type EventSurface,
  type TrackingPlanEntry,
} from "@/lib/analytics/analytics.registry";
import {
  CLIENT_EVENT_PROPERTIES,
  SERVER_EVENT_PROPERTIES,
  USER_TRAITS,
  type PropertyMeta,
} from "@/lib/analytics/analytics.properties";

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

const ALL_STATUSES: EventStatus[] = ["live", "planned", "deprecated"];
const ALL_DESTINATIONS: AnalyticsDestination[] = [
  "posthog",
  "vercel",
  "amplitude",
  "slack",
];
const ALL_SURFACES: EventSurface[] = ["server", "client"];

/** Property lookup for an entry — keyed by name within its surface. */
function propertiesFor(entry: TrackingPlanEntry): Record<string, PropertyMeta> {
  const registry =
    entry.surface === "server"
      ? SERVER_EVENT_PROPERTIES
      : CLIENT_EVENT_PROPERTIES;
  return (registry as Record<string, Record<string, PropertyMeta>>)[
    entry.name
  ] ?? {};
}

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

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  );
}

/** A togglable filter chip. */
function FilterChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? `border-transparent ${className ?? "bg-gray-900 text-white"}`
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function PropertyTable({ properties }: { properties: Record<string, PropertyMeta> }) {
  const names = Object.keys(properties);

  if (names.length === 0) {
    return (
      <p className="px-4 py-3 text-xs italic text-gray-400">
        No properties — this event carries no payload.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead className="text-gray-400">
        <tr>
          <th className="px-4 py-1 font-medium">Property</th>
          <th className="px-4 py-1 font-medium">Type</th>
          <th className="px-4 py-1 font-medium">Required</th>
          <th className="px-4 py-1 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {names.map((name) => {
          const meta = properties[name]!;
          return (
            <tr key={name} className="align-top">
              <td className="px-4 py-1 font-mono text-gray-800">{name}</td>
              <td className="px-4 py-1 font-mono text-gray-500">{meta.type}</td>
              <td className="px-4 py-1">
                {meta.required ? (
                  <span className="text-gray-700">required</span>
                ) : (
                  <span className="text-gray-400">optional</span>
                )}
              </td>
              <td className="px-4 py-1 text-gray-500">
                {meta.description}
                {meta.values && (
                  <span className="ml-1 font-mono text-gray-400">
                    {meta.description ? " — " : ""}
                    {meta.values.join(" | ")}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EventRow({ entry }: { entry: TrackingPlanEntry }) {
  const [open, setOpen] = useState(false);
  const properties = propertiesFor(entry);
  const propCount = Object.keys(properties).length;

  return (
    <>
      <tr
        className="cursor-pointer align-top hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-2 font-mono text-xs text-gray-900">
          <span className="flex items-center gap-1">
            <ChevronRight
              className={`h-3 w-3 text-gray-400 transition-transform ${
                open ? "rotate-90" : ""
              }`}
            />
            {entry.name}
            <span className="ml-1 text-[10px] font-normal text-gray-400">
              {propCount > 0 ? `${propCount} prop${propCount === 1 ? "" : "s"}` : "—"}
            </span>
          </span>
        </td>
        <td className="px-4 py-2">
          <StatusBadge status={entry.status} />
        </td>
        <td className="px-4 py-2">
          <DestinationBadges destinations={entry.destinations} />
        </td>
        <td className="px-4 py-2 text-gray-600">{entry.description}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="border-t border-gray-100 bg-gray-50/50 p-0">
            <PropertyTable properties={properties} />
          </td>
        </tr>
      )}
    </>
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
  if (entries.length === 0) return null;
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
                <CategoryRows key={category} category={category} rows={rows} />
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
        <EventRow key={`${entry.surface}:${entry.name}`} entry={entry} />
      ))}
    </>
  );
}

/** Property names that appear on more than one event, with where they're used. */
function SharedProperties() {
  const shared = useMemo(() => {
    const usage = new Map<string, { events: string[]; types: Set<string> }>();
    for (const entry of TRACKING_PLAN) {
      const props = propertiesFor(entry);
      for (const [propName, meta] of Object.entries(props)) {
        const record = usage.get(propName) ?? { events: [], types: new Set() };
        record.events.push(entry.name);
        record.types.add(meta.type);
        usage.set(propName, record);
      }
    }
    return [...usage.entries()]
      .filter(([, r]) => r.events.length > 1)
      .sort((a, b) => b[1].events.length - a[1].events.length);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Shared properties
        <span className="ml-2 text-sm font-normal text-gray-500">
          {shared.length} reused across events
        </span>
      </h2>
      <p className="text-sm text-gray-600">
        Property names used by more than one event — keep these consistent so
        cross-event analysis (filters, breakdowns) lines up in PostHog and
        Amplitude.
      </p>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Property</th>
                <th className="px-4 py-2 font-medium">Type(s)</th>
                <th className="px-4 py-2 font-medium">Used by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shared.map(([propName, r]) => (
                <tr key={propName} className="align-top">
                  <td className="px-4 py-2 font-mono text-xs text-gray-900">
                    {propName}
                    <span className="ml-1 text-[10px] font-normal text-gray-400">
                      ×{r.events.length}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {[...r.types].join(", ")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {r.events.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function IdentifyTraits() {
  const names = Object.keys(USER_TRAITS);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Identify · user traits
        <span className="ml-2 text-sm font-normal text-gray-500">
          {names.length} traits
        </span>
      </h2>
      <p className="text-sm text-gray-600">
        Attached to the user profile (not events) via PostHog{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">identifyUser</code>{" "}
        (server) and Amplitude{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">identify</code>{" "}
        (client).
      </p>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Trait</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {names.map((name) => {
                const meta = USER_TRAITS[name]!;
                return (
                  <tr key={name} className="align-top">
                    <td className="px-4 py-2 font-mono text-xs text-gray-900">
                      {name}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">
                      {meta.type}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {meta.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackingPlanPage() {
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<Set<EventStatus>>(new Set());
  const [destinations, setDestinations] = useState<Set<AnalyticsDestination>>(
    new Set(),
  );
  const [surfaces, setSurfaces] = useState<Set<EventSurface>>(new Set());

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TRACKING_PLAN.filter((entry) => {
      if (surfaces.size > 0 && !surfaces.has(entry.surface)) return false;
      if (statuses.size > 0 && !statuses.has(entry.status)) return false;
      if (
        destinations.size > 0 &&
        !entry.destinations.some((d) => destinations.has(d))
      )
        return false;
      if (q) {
        const props = propertiesFor(entry);
        const haystack = [
          entry.name,
          entry.description,
          entry.category,
          ...Object.keys(props),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [search, statuses, destinations, surfaces]);

  const serverEvents = filtered.filter((e) => e.surface === "server");
  const clientEvents = filtered.filter((e) => e.surface === "client");
  const liveCount = TRACKING_PLAN.filter((e) => e.status === "live").length;
  const plannedCount = TRACKING_PLAN.filter(
    (e) => e.status === "planned",
  ).length;
  const totalServer = TRACKING_PLAN.filter((e) => e.surface === "server").length;
  const totalClient = TRACKING_PLAN.filter((e) => e.surface === "client").length;

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
          . Destinations are derived from the routing policy; status is a manual
          declaration of code coverage. Click a row to see its properties.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryStat label="Total events" value={TRACKING_PLAN.length} />
        <SummaryStat label="Live" value={liveCount} />
        <SummaryStat label="Planned" value={plannedCount} />
        <SummaryStat
          label="Server / Client"
          value={`${totalServer} / ${totalClient}`}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, descriptions, properties…"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-gray-400">
              Destination
            </span>
            {ALL_DESTINATIONS.map((d) => (
              <FilterChip
                key={d}
                active={destinations.has(d)}
                className={destStyles[d]}
                onClick={() => toggle(destinations, setDestinations, d)}
              >
                {d}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-gray-400">
              Status
            </span>
            {ALL_STATUSES.map((s) => (
              <FilterChip
                key={s}
                active={statuses.has(s)}
                className={statusStyles[s]}
                onClick={() => toggle(statuses, setStatuses, s)}
              >
                {s}
              </FilterChip>
            ))}
            <span className="ml-2 text-xs font-medium uppercase text-gray-400">
              Surface
            </span>
            {ALL_SURFACES.map((s) => (
              <FilterChip
                key={s}
                active={surfaces.has(s)}
                onClick={() => toggle(surfaces, setSurfaces, s)}
              >
                {s}
              </FilterChip>
            ))}
          </div>
        </CardContent>
      </Card>

      <SurfaceSection surface="server" entries={serverEvents} />
      <SurfaceSection surface="client" entries={clientEvents} />
      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          No events match the current filters.
        </p>
      )}

      <SharedProperties />
      <IdentifyTraits />
    </div>
  );
}
