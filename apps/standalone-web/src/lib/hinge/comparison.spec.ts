import { describe, expect, it } from "bun:test";
import {
  normalizeHingeComparison,
  buildHingeComparisonTimeline,
  type HingeComparisonSource,
} from "./comparison";

// Wrong zeros or double-counted events would misrepresent a person's dating
// history. Type checks cannot distinguish unavailable data or duplicate ledgers.
const source = (
  id: string,
  from: string,
  to: string,
): HingeComparisonSource => ({
  hingeId: id.repeat(64),
  createDate: new Date(from),
  firstAccountCreateDate: null,
  lastSeenAt: new Date(to),
  csvActivity: null,
  matches: [],
  interactions: [],
});
describe("Hinge comparison evidence", () => {
  it("spans disjoint exports, preserves gaps and missing metrics, and counts legacy messages only once", () => {
    const old = source("a", "2020-10-09", "2024-01-27");
    old.matches = [
      {
        matchedAt: new Date("2021-01-04"),
        messages: [{ sentDate: new Date("2021-01-05") }],
      },
    ];
    old.interactions = [
      { type: "MESSAGE_SENT", timestamp: new Date("2021-01-05") },
    ];
    const recent = source("b", "2024-11-16", "2026-10-16");
    recent.csvActivity = {
      version: 1,
      tables: ["chat_message", "match_skips"],
      events: [
        {
          id: `${"c".repeat(64)}:0`,
          kind: "MESSAGE_SENT",
          timestamp: "2025-01-04T00:00:00Z",
          conversationId: "d".repeat(64),
        },
      ],
    };
    const profiles = [
      normalizeHingeComparison(old),
      normalizeHingeComparison(recent),
    ];
    const chart = buildHingeComparisonTimeline(profiles, "messagesSent");
    expect(chart.domain).toEqual([
      Date.parse("2020-10-09"),
      Date.parse("2026-10-17"),
    ]);
    expect(chart.totals).toEqual({ [old.hingeId]: 1, [recent.hingeId]: 1 });
    expect(
      chart.data.find((row) => row.date === "2021-01-01")?.[recent.hingeId],
    ).toBeNull();
    expect(
      chart.data.find((row) => row.date === "2025-02-01")?.[recent.hingeId],
    ).toBe(0);
    const matches = buildHingeComparisonTimeline(profiles, "matches");
    expect(matches.totals[recent.hingeId]).toBeNull();
    expect(matches.data.every((row) => row[recent.hingeId] === null)).toBe(
      true,
    );
    expect(JSON.stringify(profiles)).not.toContain("d".repeat(64));
  });
  it("keeps date-filtered totals consistent with plotted buckets without truncating long ranges", () => {
    const input = source("a", "2000-01-01", "2026-10-16");
    input.interactions = ["2021-01-01", "2021-01-31", "2021-02-01"].map(
      (date) => ({ type: "LIKE_SENT", timestamp: new Date(date) }),
    );
    const profile = normalizeHingeComparison(input);
    const selected = buildHingeComparisonTimeline(
      [profile],
      "likes",
      "monthly",
      "2021-01-31",
      "2021-01-31",
    );
    expect(selected.totals[input.hingeId]).toBe(1);
    expect(selected.data[0]?.[input.hingeId]).toBe(1);
    expect(
      buildHingeComparisonTimeline([profile], "likes", "daily").data,
    ).toHaveLength(0);
  });
});
