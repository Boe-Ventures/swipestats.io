import { createHash } from "node:crypto";

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function getSwipeRankDatabaseCacheNamespace(
  databaseUrl = process.env.DATABASE_URL,
): string {
  if (!databaseUrl) return shortHash("database-unconfigured");

  try {
    return shortHash(new URL(databaseUrl).hostname);
  } catch {
    return shortHash("database-url-invalid");
  }
}

export function getSwipeRankDeploymentCacheNamespace({
  databaseUrl = process.env.DATABASE_URL,
  deploymentUrl = process.env.VERCEL_URL,
  commitSha = process.env.VERCEL_GIT_COMMIT_SHA,
}: {
  databaseUrl?: string;
  deploymentUrl?: string;
  commitSha?: string;
} = {}): string {
  return shortHash(
    [
      getSwipeRankDatabaseCacheNamespace(databaseUrl),
      deploymentUrl ?? "non-vercel",
      commitSha ?? "commit-unknown",
    ].join(":"),
  );
}
