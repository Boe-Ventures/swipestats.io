import { describe, expect, mock, test } from "bun:test";

await mock.module("@/server/db", () => ({
  db: {},
  withTransaction: mock(),
}));
await mock.module("./public-cache", () => ({
  invalidatePublicSwipeRankCache: mock(() => true),
}));
await mock.module("./lifecycle.service", () => ({
  lockTinderSwipeRankPolicyInTx: mock(),
}));

const { normalizeSwipeRankExclusionInput } =
  await import("./exclusion.service");

describe("SwipeRank profile exclusion", () => {
  test("normalizes the shared admin and CLI write contract", () => {
    expect(
      normalizeSwipeRankExclusionInput({
        providerProfileId: " tinder-one ",
        excluded: true,
        reason: " automation-like activity ",
        actor: " admin:user-one ",
      }),
    ).toEqual({
      providerProfileId: "tinder-one",
      excluded: true,
      reason: "automation-like activity",
      actor: "admin:user-one",
    });
  });

  test("requires a review reason when excluding", () => {
    expect(() =>
      normalizeSwipeRankExclusionInput({
        providerProfileId: "tinder-one",
        excluded: true,
        reason: " ",
        actor: "agent:codex",
      }),
    ).toThrow("reason must be 3–500 characters");
  });

  test("restores without retaining active exclusion metadata", () => {
    expect(
      normalizeSwipeRankExclusionInput({
        providerProfileId: "tinder-one",
        excluded: false,
        reason: "ignored on restore",
        actor: "agent:codex",
      }),
    ).toEqual({
      providerProfileId: "tinder-one",
      excluded: false,
      reason: null,
      actor: "agent:codex",
    });
  });
});
