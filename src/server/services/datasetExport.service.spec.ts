import { afterEach, expect, spyOn, test } from "bun:test";
import { db } from "@/server/db";
import { streamDatasetJsonl } from "./datasetExport.service";

let selectSpy: ReturnType<typeof spyOn<typeof db, "select">> | undefined;
afterEach(() => selectSpy?.mockRestore());

test("batched exports keep each profile's rows together and apply the research contract", async () => {
  const results = [
    [{ tinderProfileId: "b", hingeProfileId: null, marker: "meta-b" }],
    [
      { tinderProfileId: "b", hingeProfileId: null, marker: "usage-b" },
      { tinderProfileId: "a", hingeProfileId: null, marker: "usage-a" },
    ],
    [{ profileId: "b", count: 7 }],
  ];
  selectSpy = spyOn(db, "select").mockImplementation((() => {
    const rows = results.shift()!;
    const query = Object.assign(Promise.resolve(rows), {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      groupBy: () => query,
    });
    return query;
  }) as unknown as typeof db.select);
  type Input = Parameters<typeof streamDatasetJsonl>[0];
  const input = {
    exportId: "fixture",
    exportRecord: { tier: "STANDARD", profileCount: 2, recency: "MIXED" },
    profiles: ["a", "b"].map((tinderId) => ({
      tinderId,
      userId: "private-account",
      computed: false,
      bioOriginal: "private-original",
      llmAnalyzedAt: "internal",
      bio: "public bio",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
      swipestatsVersion: "fixture-version",
    })),
    startTime: Date.now(),
  } as unknown as Input;
  type RecordLine = {
    type: string;
    profile: Record<string, unknown>;
    meta: { marker: string } | null;
    usage: { marker: string }[];
    matchCount: number;
  };
  const records: RecordLine[] = [];
  for await (const line of streamDatasetJsonl(input))
    records.push(JSON.parse(line) as RecordLine);
  const profiles = records.filter((row) => row.type === "profile");
  expect(profiles).toHaveLength(2);
  expect(profiles[0]!.meta).toBeNull();
  expect(profiles[0]!.matchCount).toBe(0);
  expect(profiles[0]!.usage[0]!.marker).toBe("usage-a");
  expect(profiles[1]!.meta!.marker).toBe("meta-b");
  expect(profiles[1]!.usage[0]!.marker).toBe("usage-b");
  expect(profiles[1]!.matchCount).toBe(7);
  for (const row of profiles) {
    expect(row.profile).not.toHaveProperty("userId");
    expect(row.profile).not.toHaveProperty("computed");
    expect(row.profile).not.toHaveProperty("bioOriginal");
    expect(row.profile).not.toHaveProperty("llmAnalyzedAt");
    expect(row.profile.createdAt).toBe("2026-01-01");
    expect(row.profile.updatedAt).toBe("2026-01-02");
    expect(row.profile.swipestatsVersion).toBe("fixture-version");
  }
  expect(selectSpy).toHaveBeenCalledTimes(3);
});
