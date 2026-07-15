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
});
