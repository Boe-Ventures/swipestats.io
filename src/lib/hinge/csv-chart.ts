import type { HingeCsvSummary, HingeCsvKind } from "./csv-activity";
import { HINGE_CSV_KINDS } from "./csv-activity";

export interface HingeChartEvent {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
}
const DAY_MS = 86_400_000;
const monthStart = (time: number) => {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};
const nextMonth = (time: number) => {
  const date = new Date(time);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
};

/** Numeric UTC bounds let bands start/end inside a month and clip correctly
 * when the subscription began before the selected activity range. */
export function buildHingeCsvTimeline(
  daily: HingeCsvSummary["daily"],
  events: HingeChartEvent[] = [],
  from = "",
  through = "",
) {
  const bounds = daily.map((day) => Date.parse(`${day.date}T00:00:00Z`));
  for (const event of events) {
    bounds.push(event.startDate.getTime());
    if (event.endDate) bounds.push(event.endDate.getTime() - 1);
  }
  if (!bounds.length && (!from || !through))
    return { monthly: [], domain: [0, 1] as [number, number], overlays: [] };
  const earliest = bounds.reduce((a, b) => Math.min(a, b), Infinity);
  const latest = bounds.reduce((a, b) => Math.max(a, b), -Infinity);
  const min = from ? Date.parse(`${from}T00:00:00Z`) : monthStart(earliest);
  const max = through
    ? Date.parse(`${through}T00:00:00Z`) + DAY_MS
    : nextMonth(latest);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min)
    return { monthly: [], domain: [0, 1] as [number, number], overlays: [] };
  const byMonth = new Map<string, Record<HingeCsvKind, number>>();
  for (const day of daily) {
    const at = Date.parse(`${day.date}T00:00:00Z`);
    if (at < min || at >= max) continue;
    const month = day.date.slice(0, 7);
    const counts =
      byMonth.get(month) ??
      (Object.fromEntries(HINGE_CSV_KINDS.map((kind) => [kind, 0])) as Record<
        HingeCsvKind,
        number
      >);
    for (const kind of HINGE_CSV_KINDS) counts[kind] += day[kind];
    byMonth.set(month, counts);
  }
  const monthly = [];
  for (let at = monthStart(min); at < max; at = nextMonth(at)) {
    const month = new Date(at).toISOString().slice(0, 7);
    const counts =
      byMonth.get(month) ??
      (Object.fromEntries(HINGE_CSV_KINDS.map((kind) => [kind, 0])) as Record<
        HingeCsvKind,
        number
      >);
    monthly.push({
      month,
      timestamp: (Math.max(min, at) + Math.min(max, nextMonth(at))) / 2,
      ...counts,
    });
  }
  const overlays = events
    .map((event) => ({
      id: event.id,
      name: event.name,
      start: event.endDate
        ? Math.max(min, event.startDate.getTime())
        : event.startDate.getTime(),
      end: event.endDate ? Math.min(max, event.endDate.getTime()) : null,
    }))
    .filter(
      (event) =>
        event.start < max &&
        (event.end === null
          ? event.start >= min
          : event.end > min && event.end > event.start),
    );
  // Adjacent renewals form one continuous visual band. The events themselves
  // remain separate editable life events with their actual period dates.
  const combined: typeof overlays = [];
  for (const event of overlays.sort((a, b) => a.start - b.start)) {
    const previous = combined.find(
      (candidate) =>
        event.id.startsWith("evt_hinge_subscription_") &&
        candidate.id.startsWith("evt_hinge_subscription_") &&
        candidate.name === event.name &&
        candidate.end !== null &&
        event.end !== null &&
        candidate.end >= event.start,
    );
    if (previous && event.end !== null)
      previous.end = Math.max(previous.end!, event.end);
    else combined.push({ ...event });
  }
  return {
    monthly,
    domain: [min, max] as [number, number],
    overlays: combined,
  };
}
