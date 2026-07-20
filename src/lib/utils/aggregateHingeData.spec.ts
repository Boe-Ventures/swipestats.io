import { describe, expect, it } from "bun:test";

import type { HingeInteraction, Match, Message } from "@/server/db/schema";
import {
  aggregateHingeData,
  alignHingeInteractionsToComparisonPeriod,
  alignHingeMatchesToComparisonPeriod,
  calculateInclusiveHingeDateRange,
  fillHingePeriodRange,
  filterMatchesByDateRange,
  getHingePeriodDisplayFromKey,
  getHingePeriodKey,
} from "./aggregateHingeData";

describe("aggregateHingeData", () => {
  it("uses real ISO week-years at the new-year boundary", () => {
    expect(
      getHingePeriodKey(new Date("2021-01-01T12:00:00.000Z"), "weekly"),
    ).toBe("2020-W53");
  });

  it("formats ISO week keys from their actual Monday", () => {
    expect(getHingePeriodDisplayFromKey("2020-W53", "weekly")).toBe(
      "Week of Dec 28",
    );
    expect(getHingePeriodDisplayFromKey("2021-W01", "weekly")).toBe(
      "Week of Jan 4",
    );
  });

  it("counts distinct messaged threads rather than all matches", () => {
    const timestamp = new Date("2024-01-01T12:00:00.000Z");
    const interactions = [
      { type: "MATCH", timestamp, matchId: "match-1" },
      { type: "MATCH", timestamp, matchId: "match-2" },
      { type: "MESSAGE_SENT", timestamp, matchId: "match-1" },
      { type: "MESSAGE_SENT", timestamp, matchId: "match-1" },
    ] as HingeInteraction[];
    const matches = [
      {
        id: "match-1",
        matchedAt: timestamp,
        messages: [
          { sentDate: timestamp },
          { sentDate: new Date("2024-01-01T13:00:00.000Z") },
        ],
      },
      { id: "match-2", matchedAt: timestamp, messages: [] },
    ] as (Match & { messages: Message[] })[];

    const [day] = aggregateHingeData(matches, interactions, "daily");

    expect(day).toMatchObject({
      matches: 2,
      messagesSent: 2,
      conversationsStarted: 1,
    });
  });

  it("keeps empty calendar buckets so the timeline does not compress gaps", () => {
    const interactions = [
      {
        type: "LIKE_SENT",
        timestamp: new Date("2024-01-15T12:00:00.000Z"),
      },
      {
        type: "LIKE_SENT",
        timestamp: new Date("2024-03-15T12:00:00.000Z"),
      },
    ] as HingeInteraction[];

    expect(aggregateHingeData([], interactions, "monthly")).toMatchObject([
      { period: "2024-01", likes: 1 },
      { period: "2024-02", likes: 0 },
      { period: "2024-03", likes: 1 },
    ]);
  });

  it("fills inactive selected-window boundaries", () => {
    const observed = aggregateHingeData(
      [],
      [
        {
          type: "LIKE_SENT",
          timestamp: new Date("2024-02-15T12:00:00.000Z"),
        },
      ] as HingeInteraction[],
      "monthly",
    );

    expect(
      fillHingePeriodRange(
        observed,
        "monthly",
        new Date(2024, 0, 1),
        new Date(2024, 2, 31),
      ),
    ).toMatchObject([
      { period: "2024-01", likes: 0 },
      { period: "2024-02", likes: 1 },
      { period: "2024-03", likes: 0 },
    ]);
  });

  it("anchors presets to the provider UTC calendar day", () => {
    const range = calculateInclusiveHingeDateRange(
      2,
      new Date("2024-01-02T00:30:00.000+02:00"),
    );
    expect([
      range.from.getFullYear(),
      range.from.getMonth() + 1,
      range.from.getDate(),
    ]).toEqual([2023, 12, 31]);
    expect([
      range.to.getFullYear(),
      range.to.getMonth() + 1,
      range.to.getDate(),
    ]).toEqual([2024, 1, 1]);
  });

  it("rebuckets previous events by elapsed day on the target calendar", () => {
    const interactions = [
      { type: "LIKE_SENT", timestamp: new Date("2024-01-31T12:00:00Z") },
      { type: "LIKE_SENT", timestamp: new Date("2024-02-01T12:00:00Z") },
    ] as HingeInteraction[];

    const aligned = alignHingeInteractionsToComparisonPeriod(
      interactions,
      new Date(2024, 0, 31),
      new Date(2024, 2, 1),
    );
    const result = aggregateHingeData([], aligned, "monthly");

    expect(
      aligned.map((row) => row.timestamp.toISOString().slice(0, 10)),
    ).toEqual(["2024-03-01", "2024-03-02"]);
    expect(result).toMatchObject([{ period: "2024-03", likes: 2 }]);
  });

  it("filters match creation and message facts independently", () => {
    const matches = [
      {
        id: "older-match-with-current-message",
        matchedAt: new Date("2024-01-01T12:00:00Z"),
        messages: [
          { sentDate: new Date("2024-02-10T12:00:00Z") },
          { sentDate: new Date("2024-03-10T12:00:00Z") },
        ],
      },
      {
        id: "current-match-with-older-message",
        matchedAt: new Date("2024-02-11T12:00:00Z"),
        messages: [{ sentDate: new Date("2024-01-11T12:00:00Z") }],
      },
      {
        id: "fully-outside",
        matchedAt: new Date("2024-01-02T12:00:00Z"),
        messages: [{ sentDate: new Date("2024-03-02T12:00:00Z") }],
      },
    ] as (Match & { messages: Message[] })[];

    const result = filterMatchesByDateRange(
      matches,
      new Date(2024, 1, 1),
      new Date(2024, 1, 29),
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "older-match-with-current-message",
      matchedAt: null,
      messages: [{ sentDate: new Date("2024-02-10T12:00:00Z") }],
    });
    expect(result[1]).toMatchObject({
      id: "current-match-with-older-message",
      matchedAt: new Date("2024-02-11T12:00:00Z"),
      messages: [],
    });
  });

  it("rebuckets canonical match and message facts by elapsed day", () => {
    const matches = [
      {
        id: "match-1",
        matchedAt: new Date("2024-01-31T12:00:00Z"),
        messages: [{ sentDate: new Date("2024-02-01T13:00:00Z") }],
      },
    ] as (Match & { messages: Message[] })[];

    const [aligned] = alignHingeMatchesToComparisonPeriod(
      matches,
      new Date(2024, 0, 31),
      new Date(2024, 2, 1),
    );

    expect(aligned?.matchedAt?.toISOString()).toBe("2024-03-01T12:00:00.000Z");
    expect(aligned?.messages[0]?.sentDate.toISOString()).toBe(
      "2024-03-02T13:00:00.000Z",
    );
    expect(
      aggregateHingeData(aligned ? [aligned] : [], [], "daily"),
    ).toMatchObject([
      { period: "2024-03-01", matches: 1, messagesSent: 0 },
      { period: "2024-03-02", matches: 0, messagesSent: 1 },
    ]);
  });
});
