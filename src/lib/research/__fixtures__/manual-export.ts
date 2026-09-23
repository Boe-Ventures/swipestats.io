import { expect, mock } from "bun:test";
import { mkdtempSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getTableName } from "drizzle-orm";
const profile = {
  tinderId: "stable-profile",
  userId: "account-private",
  bio: "Research bio",
  bioOriginal: "Research bio",
  country: "NO",
  futureSecret: "private-value",
};
const message = {
  matchId: "stable-match",
  content: "Research message",
  contentRaw: "Research message",
  contentSanitized: null,
  messageType: "TEXT",
  order: 0,
};
await mock.module("@/server/db", () => ({
  db: {
    select: (columns?: Record<string, unknown>) => ({
      from: (table: Parameters<typeof getTableName>[0]) => {
        const tableName = getTableName(table);
        const rows =
          tableName === "tinder_profile"
            ? columns
              ? [{ tinderId: "stable-profile", country: "NO" }]
              : [profile]
            : tableName === "match"
              ? [{ id: "stable-match", tinderProfileId: "stable-profile" }]
              : tableName === "message"
                ? [message]
                : [];
        const builder = {
          innerJoin: () => builder,
          where: () => builder,
          orderBy: () => builder,
          then: (resolve: (value: unknown[]) => void) =>
            Promise.resolve(rows).then(resolve),
        };
        return builder;
      },
    }),
  },
}));
const dir = mkdtempSync(join(tmpdir(), "research-manual-test-"));
try {
  const { exportProfiles } =
    await import("@/scripts/llm-analysis/export-research-dataset");
  const output = join(dir, "test.jsonl");
  await exportProfiles(["stable-profile"], output);
  const text = readFileSync(output, "utf8");
  const record = JSON.parse(text) as {
    profile: { tinderId: string; bio: string };
    matches: {
      match: { id: string };
      messages: { content: string; contentRaw: string }[];
    }[];
  };
  expect(record.profile.tinderId).toBe("stable-profile");
  expect(record.profile.bio).toBe("Research bio");
  // Same shape consumed by anonymizeProfile; raw input does not require DB redaction.
  const conversations = record.matches.filter((m) => m.messages.length > 0);
  expect(conversations[0]?.match.id).toBe("stable-match");
  expect(conversations[0]?.messages[0]?.content).toBe("Research message");
  expect(conversations[0]?.messages[0]?.contentRaw).toBe("Research message");
  expect(text).not.toContain("account-private");
  expect(text).not.toContain("private-value");
  expect(statSync(output).mode & 0o777).toBe(0o600);
  console.log("Manual export checks passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
