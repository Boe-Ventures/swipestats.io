import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import {
  createTextRedactionModels,
  DEFAULT_PII_THRESHOLD,
  JEV_INPUT_USD_PER_MILLION,
  redactTextProfile,
  TEXT_REDACTION_VERSION,
  textInputDigest,
  textProfileSchema,
  type RedactionUsage,
} from "@/lib/research/text-redaction";

const [inputFile, outputDirectory, limitArgument = "20"] =
  process.argv.slice(2);
if (!inputFile || !outputDirectory)
  throw new Error(
    "Usage: redact-text-fixture.ts input.jsonl output-directory [limit]",
  );
const limit = z.coerce.number().int().positive().parse(limitArgument);
const jevModel = process.env.JEV_MODEL ?? "jev-1.14.0";
const redactionModel = process.env.REDACTION_MODEL ?? "claude-sonnet-4-6";
const threshold = z.coerce
  .number()
  .min(0)
  .max(1)
  .parse(process.env.JEV_PII_THRESHOLD ?? String(DEFAULT_PII_THRESHOLD));
const maxCharacters = z.coerce
  .number()
  .int()
  .positive()
  .parse(process.env.REDACTION_MAX_CHARACTERS ?? "60000");
const configuration = {
  version: TEXT_REDACTION_VERSION,
  jevModel,
  redactionModel,
  threshold,
  maxCharacters,
};
const configurationDigest = createHash("sha256")
  .update(JSON.stringify(configuration))
  .digest("hex");
await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
const usage: RedactionUsage[] = [];
const models = createTextRedactionModels({
  jevModel,
  redactionModel,
  onUsage: (entry) => usage.push(entry),
});
const summary = {
  attempted: 0,
  completed: 0,
  resumed: 0,
  failed: 0,
  screenedGroups: 0,
  flaggedGroups: 0,
  jevInputTokens: 0,
  jevEstimatedUsd: 0,
  anthropicInputTokens: 0,
  anthropicOutputTokens: 0,
};
const lines = createInterface({
  input: createReadStream(inputFile),
  crlfDelay: Infinity,
});
for await (const line of lines) {
  if (!line.trim()) continue;
  if (summary.attempted >= limit) break;
  const profile = textProfileSchema.parse(JSON.parse(line));
  summary.attempted++;
  const subject = createHash("sha256")
    .update(`${profile.provider}:${profile.profileId}`)
    .digest("hex");
  const destination = path.join(outputDirectory, `${subject}.json`);
  const inputDigest = textInputDigest(profile);
  let cached;
  try {
    cached = JSON.parse(await readFile(destination, "utf8")) as {
      configurationDigest?: string;
      processing?: { inputDigest?: string };
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (
    cached?.configurationDigest === configurationDigest &&
    cached.processing?.inputDigest === inputDigest
  ) {
    summary.resumed++;
    continue;
  }
  try {
    const result = await redactTextProfile(profile, models, {
      threshold,
      maxCharacters,
    });
    const partial = `${destination}.partial`;
    await writeFile(
      partial,
      JSON.stringify({ ...result, configurationDigest }),
      { mode: 0o600 },
    );
    await rename(partial, destination);
    summary.completed++;
    summary.screenedGroups += result.processing.screenedGroups;
    summary.flaggedGroups += result.processing.flaggedGroups;
  } catch {
    summary.failed++;
    // Provider exceptions can contain source text. Report only a private subject hash.
    console.error(
      JSON.stringify({
        subject,
        status: "failed",
        retry: "rerun the same command",
      }),
    );
  }
}
summary.jevInputTokens = usage
  .filter((entry) => entry.provider === "jev")
  .reduce((total, entry) => total + entry.inputTokens, 0);
summary.jevEstimatedUsd =
  (summary.jevInputTokens / 1e6) * JEV_INPUT_USD_PER_MILLION;
summary.anthropicInputTokens = usage
  .filter((entry) => entry.provider === "anthropic")
  .reduce((total, entry) => total + entry.inputTokens, 0);
summary.anthropicOutputTokens = usage
  .filter((entry) => entry.provider === "anthropic")
  .reduce((total, entry) => total + entry.outputTokens, 0);
await writeFile(
  path.join(outputDirectory, "run-summary.json"),
  JSON.stringify({ configuration, summary, usage }, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify(summary));
if (summary.failed) process.exitCode = 1;
