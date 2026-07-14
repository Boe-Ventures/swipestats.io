import { describe, expect, test } from "bun:test";

import {
  refreshTinderSwipeRankBestEffort,
  scheduleTinderSwipeRankRefresh,
  scheduleTinderSwipeRankUserRefresh,
  type TinderSwipeRankRefreshDependencies,
  type TinderSwipeRankUserRefreshDependencies,
} from "./lifecycle.service";

describe("SwipeRank Tinder lifecycle", () => {
  test("normalizes scoped IDs before refreshing", async () => {
    const requests: unknown[] = [];

    const refreshed = await refreshTinderSwipeRankBestEffort(
      [" one ", "two", "one"],
      {
        recompute: (options) => {
          requests.push(options);
          return Promise.resolve();
        },
        logError: () => undefined,
      },
    );

    expect(refreshed).toBe(true);
    expect(requests).toEqual([{ profileIds: ["one", "two"] }]);
  });

  test("a recompute failure is contained after commit", async () => {
    const errors: string[] = [];

    const refreshed = await refreshTinderSwipeRankBestEffort(["one"], {
      recompute: () => Promise.reject(new Error("analytical failure")),
      logError: (message) => errors.push(message),
    });

    expect(refreshed).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).not.toContain("one");
  });

  test("a defer failure cannot escape the upload path", async () => {
    let task: Promise<unknown> | undefined;
    const dependencies: TinderSwipeRankRefreshDependencies = {
      recompute: () => Promise.resolve(),
      defer: (refresh) => {
        task = refresh;
        throw new Error("no request context");
      },
      logError: () => undefined,
    };

    expect(() =>
      scheduleTinderSwipeRankRefresh(["one"], dependencies),
    ).not.toThrow();
    expect(task).toBeDefined();
    await task;
  });

  test("a user descriptor change refreshes every owned Tinder profile", async () => {
    let task: Promise<unknown> | undefined;
    const requests: unknown[] = [];
    const dependencies: TinderSwipeRankUserRefreshDependencies = {
      listProfileIdsForUser: async (userId) => {
        expect(userId).toBe("user-one");
        return ["profile-one", "profile-two"];
      },
      recompute: async (options) => {
        requests.push(options);
      },
      defer: (refresh) => {
        task = refresh;
      },
      logError: () => undefined,
    };

    scheduleTinderSwipeRankUserRefresh(" user-one ", dependencies);
    expect(task).toBeDefined();
    await task;
    expect(requests).toEqual([{ profileIds: ["profile-one", "profile-two"] }]);
  });
});
