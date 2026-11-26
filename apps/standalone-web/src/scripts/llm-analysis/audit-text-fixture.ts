import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { appendFileSync } from "node:fs";
import {
  createTextRedactionModels,
  REDACTION_POLICY,
  TEXT_REDACTION_VERSION,
  textProfileSchema,
  type RedactionUsage,
} from "@/lib/research/text-redaction";

// Independent redaction of negatives is deliberate: this measures disagreement.
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: audit-text-fixture.ts input.jsonl output-directory");
const profiles = (await readFile(input, "utf8"))
  .trim()
  .split("\n")
  .map((line) => textProfileSchema.parse(JSON.parse(line)));
const conversations = profiles.flatMap((profile) => profile.conversations);
if (new Set(conversations.map((c) => c.id)).size !== conversations.length)
  throw new Error("Duplicate conversations in fixture");
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
await mkdir(output, { recursive: true, mode: 0o700 });
const usageFile = path.join(output, "usage.jsonl");
const usage: RedactionUsage[] = [];
try {
  const recorded = (await readFile(usageFile, "utf8")).trim();
  if (recorded)
    usage.push(
      ...recorded.split("\n").map((line) => JSON.parse(line) as RedactionUsage),
    );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const models = createTextRedactionModels({
  onUsage: (entry) => {
    appendFileSync(usageFile, JSON.stringify(entry) + "\n", { mode: 0o600 });
    usage.push(entry);
  },
});
const configuration = {
  version: TEXT_REDACTION_VERSION,
  policy: REDACTION_POLICY,
  jev: "jev-1.14.0",
  redactor: "claude-sonnet-4-6",
};
await mkdir(output, { recursive: true, mode: 0o700 });
const results: Array<{
  subject: string;
  status: string;
  score?: number;
  changedMessages?: number;
  reason?: string;
}> = [];
for (let start = 0; start < conversations.length; start += 8) {
  await Promise.all(
    conversations.slice(start, start + 8).map(async (conversation) => {
      const subject = digest(conversation.id);
      const fingerprint = digest(
        JSON.stringify({ configuration, conversation }),
      );
      const file = path.join(output, `${subject}.json`);
      try {
        const cached = JSON.parse(await readFile(file, "utf8")) as {
          fingerprint: string;
          result: (typeof results)[number];
        };
        if (cached.fingerprint === fingerprint) {
          results.push({ ...cached.result, status: "cached" });
          return;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      try {
        const screenFile = path.join(output, `${subject}.screen.json`);
        let screen: { fingerprint: string; score: number } | undefined;
        try {
          screen = JSON.parse(
            await readFile(screenFile, "utf8"),
          ) as typeof screen;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        const score =
          screen?.fingerprint === fingerprint
            ? screen.score
            : await models.screen([conversation]);
        await writeFile(
          `${screenFile}.partial`,
          JSON.stringify({ fingerprint, score }),
          { mode: 0o600 },
        );
        await rename(`${screenFile}.partial`, screenFile);
        const redacted = await models.redact(conversation);
        const result = {
          subject,
          status: "complete",
          score,
          changedMessages: redacted.messages.filter(
            (message, i) =>
              message.content !== conversation.messages[i]!.content,
          ).length,
        };
        await writeFile(
          `${file}.partial`,
          JSON.stringify({ fingerprint, result, redacted }),
          { mode: 0o600 },
        );
        await rename(`${file}.partial`, file);
        results.push(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const reason = /^(Redaction |Invalid message|Jev request failed)/.test(
          message,
        )
          ? message
          : "Provider or validation error";
        results.push({ subject, status: "failed", reason });
      }
    }),
  );
  await writeFile(
    path.join(output, "summary.json.partial"),
    JSON.stringify({ configuration, results, usage }, null, 2),
    { mode: 0o600 },
  );
  await rename(
    path.join(output, "summary.json.partial"),
    path.join(output, "summary.json"),
  );
  console.log(
    JSON.stringify({
      attempted: results.length,
      total: conversations.length,
      failed: results.filter((r) => r.status === "failed").length,
    }),
  );
  if (results.slice(-8).every((r) => r.status === "failed")) break;
}
if (results.some((r) => r.status === "failed")) process.exitCode = 1;
