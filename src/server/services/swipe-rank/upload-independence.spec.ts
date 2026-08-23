import { describe, expect, test } from "bun:test";

const UPLOAD_PATHS = [
  "../profile/profile.service.ts",
  "../profile/additive.service.ts",
  "../../api/routers/profileRouter.ts",
] as const;

const RANK_SIDE_EFFECTS = [
  "recomputeTinderSwipeRankFacts",
  "scheduleTinderSwipeRank",
  "lockTinderSwipeRankMutationsInTx",
  "swipeRankSourceMutationTable",
] as const;

describe("Tinder upload independence", () => {
  test("upload code cannot compute, schedule, or journal SwipeRank", async () => {
    const sources = await Promise.all(
      UPLOAD_PATHS.map(async (path) => ({
        path,
        source: await Bun.file(new URL(path, import.meta.url)).text(),
      })),
    );

    for (const { path, source } of sources) {
      for (const sideEffect of RANK_SIDE_EFFECTS) {
        expect(source, `${path} contains ${sideEffect}`).not.toContain(
          sideEffect,
        );
      }
    }
  });
});
