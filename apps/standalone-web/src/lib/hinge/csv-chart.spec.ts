import { expect, it } from "bun:test";
import { buildHingeCsvTimeline } from "./csv-chart";

// A categorical chart drops bands whose endpoints are outside the plotted
// buckets. Numeric clipping must preserve coverage without moving old markers.
it("clips subscription coverage to the selected range and retains gaps without invented activity", () => {
  const timeline = buildHingeCsvTimeline(
    [],
    [
      {
        id: "evt_hinge_subscription_one",
        name: "Hinge subscription",
        startDate: new Date("2025-01-01Z"),
        endDate: new Date("2025-03-01Z"),
      },
      {
        id: "evt_hinge_subscription_two",
        name: "Hinge subscription",
        startDate: new Date("2025-03-01Z"),
        endDate: new Date("2025-04-01Z"),
      },
      {
        id: "old-marker",
        name: "Old event",
        startDate: new Date("2024-01-01Z"),
        endDate: null,
      },
    ],
    "2025-02-01",
    "2025-03-31",
  );
  expect(timeline.overlays).toHaveLength(1);
  expect(timeline.overlays[0]).toMatchObject({
    start: Date.parse("2025-02-01Z"),
    end: Date.parse("2025-04-01Z"),
  });
  expect(timeline.monthly.map((month) => month.month)).toEqual([
    "2025-02",
    "2025-03",
  ]);
  expect(
    timeline.monthly.every(
      (month) => month.MESSAGE_SENT === 0 && month.LIKE === 0,
    ),
  ).toBe(true);
});
