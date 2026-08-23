import { describe, expect, test } from "bun:test";

describe("owner SwipeRank surface", () => {
  test("does not restore the retired publication opt-in flow", async () => {
    const source = await Bun.file(
      new URL("./SwipeRankCard.tsx", import.meta.url),
    ).text();

    expect(source).not.toMatch(
      /SwipeRankPublicationControl|updatePublication|revokePublication|private by default|opt[ -]?in|Publish my SwipeRank/i,
    );
  });

  test("requests only published seasons without live refresh polling", async () => {
    const sources = await Promise.all(
      ["./SwipeRankCard.tsx", "./CohortBenchmarksSection.tsx"].map((path) =>
        Bun.file(new URL(path, import.meta.url)).text(),
      ),
    );

    for (const source of sources) {
      expect(source).not.toMatch(/ALL_TIME|refetchInterval/);
    }
  });
});
