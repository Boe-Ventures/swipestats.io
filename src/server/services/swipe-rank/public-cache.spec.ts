import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  getSwipeRankDatabaseCacheNamespace,
  getSwipeRankDeploymentCacheNamespace,
} = await import("./public-cache-namespace");

describe("SwipeRank public cache namespaces", () => {
  test("separates Neon database branches", () => {
    expect(
      getSwipeRankDatabaseCacheNamespace(
        "postgresql://user:secret@branch-one.example/db",
      ),
    ).not.toBe(
      getSwipeRankDatabaseCacheNamespace(
        "postgresql://user:secret@branch-two.example/db",
      ),
    );
  });

  test("does not vary with database credentials", () => {
    expect(
      getSwipeRankDatabaseCacheNamespace(
        "postgresql://user:first@branch-one.example/db",
      ),
    ).toBe(
      getSwipeRankDatabaseCacheNamespace(
        "postgresql://other:second@branch-one.example/other-db",
      ),
    );
  });

  test("separates deployments connected to the same branch", () => {
    const databaseUrl =
      "postgresql://user:secret@shared-preview.example/database";

    expect(
      getSwipeRankDeploymentCacheNamespace({
        databaseUrl,
        deploymentUrl: "preview-one.vercel.app",
        commitSha: "commit-one",
      }),
    ).not.toBe(
      getSwipeRankDeploymentCacheNamespace({
        databaseUrl,
        deploymentUrl: "preview-two.vercel.app",
        commitSha: "commit-two",
      }),
    );
  });
});
