import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCodexTextRedactor } from "@/lib/research/text-redaction-codex";
import {
  modelInput,
  textProfileSchema,
  type Conversation,
} from "@/lib/research/text-redaction";

const [fixtureDirectory, outputDirectory, maxCallsArgument = "1", mode] =
  process.argv.slice(2);
if (!fixtureDirectory || !outputDirectory)
  throw new Error(
    "Usage: benchmark-text-codex.ts fixture-directory output-directory [max-calls=1] [--large]",
  );
const maxCalls = Number(maxCallsArgument);
if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > 40)
  throw new Error("max-calls must be 1 through 40 for this bounded benchmark");
if (mode && mode !== "--large") throw new Error("Unknown benchmark mode");
process.umask(0o077);
await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const profiles = (
  await readFile(path.join(fixtureDirectory, "input.jsonl"), "utf8")
)
  .trim()
  .split("\n")
  .map((line) => textProfileSchema.parse(JSON.parse(line)));
type Candidate = {
  subject: string;
  provider: string;
  conversation: Conversation;
  baseline: Conversation;
  score: number;
  changed: boolean;
};
const candidates: Candidate[] = [];
for (const profile of profiles) {
  for (const conversation of profile.conversations) {
    const subject = digest(conversation.id);
    let baseline:
      | { redacted: Conversation; result: { score: number; status: string } }
      | undefined;
    for (const directory of ["recovery-v14", "results-v13"]) {
      try {
        baseline = JSON.parse(
          await readFile(
            path.join(fixtureDirectory, directory, `${subject}.json`),
            "utf8",
          ),
        ) as typeof baseline;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    if (!baseline?.redacted) throw new Error("Missing completed baseline");
    if (
      conversation.messages.some(
        (message, i) => message.id !== baseline.redacted.messages[i]?.id,
      )
    )
      throw new Error("Baseline message identity mismatch");
    const changed = conversation.messages.some(
      (message, i) =>
        message.content !== baseline.redacted.messages[i]!.content,
    );
    candidates.push({
      subject,
      provider: profile.provider,
      conversation,
      baseline: baseline.redacted,
      score: baseline.result.score,
      changed,
    });
  }
}
// Deliberately enriched quality sample, not a population-weighted throughput estimate.
let selected = ["TINDER", "HINGE"].flatMap((provider) =>
  [true, false].flatMap((changed) =>
    candidates
      .filter(
        (item) =>
          item.provider === provider &&
          item.changed === changed &&
          (changed || item.score < 0.2),
      )
      .sort((a, b) =>
        digest(`codex-v1:${a.subject}`).localeCompare(
          digest(`codex-v1:${b.subject}`),
        ),
      )
      .slice(0, 8),
  ),
);
if (mode === "--large") {
  const excluded = new Set(selected.map((item) => item.subject));
  const ranked = (items: Candidate[]) =>
    items.sort((a, b) =>
      digest(`codex-large-v1:${a.subject}`).localeCompare(
        digest(`codex-large-v1:${b.subject}`),
      ),
    );
  selected = ["TINDER", "HINGE"].flatMap((provider) => {
    const available = ranked(
      candidates.filter(
        (item) => item.provider === provider && !excluded.has(item.subject),
      ),
    );
    const target = provider === "TINDER" ? 192 : 64;
    const changed = available.filter((item) => item.changed);
    const remaining = target - changed.length;
    if (remaining < 0)
      throw new Error("Large sample target is smaller than positive stratum");
    const flagged = available
      .filter((item) => !item.changed && item.score >= 0.2)
      .slice(0, Math.floor(remaining / 2));
    const negative = available
      .filter((item) => !item.changed && item.score < 0.2)
      .slice(0, remaining - flagged.length);
    const result = [...changed, ...flagged, ...negative];
    if (result.length !== target)
      throw new Error("Insufficient conversations for large sample strata");
    return result;
  });
  ranked(selected);
  if (selected.some((item) => excluded.has(item.subject)))
    throw new Error("Benchmark selection overlaps previous sample");
}
const batchConversationLimit = mode === "--large" ? 32 : 8;
const batches: (typeof selected)[] = [];
for (const item of selected) {
  let batch = batches.at(-1);
  if (
    !batch ||
    batch.length >= batchConversationLimit ||
    JSON.stringify(
      modelInput([
        ...batch.map((entry) => entry.conversation),
        item.conversation,
      ]),
    ).length > 40000
  ) {
    batch = [];
    batches.push(batch);
  }
  batch.push(item);
}
const redactor = createCodexTextRedactor({
  outputDirectory: path.join(outputDirectory, "calls"),
  model: process.env.CODEX_REDACTION_MODEL ?? "gpt-6.1-terra",
  reasoning: "medium",
});
await writeFile(
  path.join(outputDirectory, "manifest.json"),
  JSON.stringify(
    {
      configuration: redactor.configuration,
      selectionMode:
        mode === "--large" ? "fresh-256-enriched" : "initial-32-enriched",
      batchConversationLimit,
      selection: selected.map(({ subject, provider, score, changed }) => ({
        subject,
        provider,
        score,
        changed,
      })),
      batchCount: batches.length,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const summary = {
  model: redactor.configuration.model,
  attemptedBatches: 0,
  completedBatches: 0,
  cachedBatches: 0,
  conversations: 0,
  messages: 0,
  changedMessages: 0,
  baselineChangedMessages: 0,
  exactMatchMessages: 0,
  differentMessages: 0,
  elapsedMs: 0,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  failed: false,
};
const differences: Array<{
  subject: string;
  provider: string;
  messageId: string;
  before: string;
  baseline: string;
  codex: string;
}> = [];
const wallStarted = Date.now();
for (const batch of batches.slice(0, maxCalls)) {
  summary.attemptedBatches++;
  try {
    const result = await redactor.redactBatch(
      batch.map((item) => item.conversation),
    );
    summary.completedBatches++;
    if (result.cached) summary.cachedBatches++;
    summary.elapsedMs += result.elapsedMs;
    summary.inputTokens += result.usage.input_tokens;
    summary.cachedInputTokens += result.usage.cached_input_tokens;
    summary.outputTokens += result.usage.output_tokens;
    result.redacted.forEach((conversation, i) => {
      const original = batch[i]!;
      summary.conversations++;
      conversation.messages.forEach((message, j) => {
        summary.messages++;
        const before = original.conversation.messages[j]!;
        const baseline = original.baseline.messages[j]!;
        if (message.content !== before.content) summary.changedMessages++;
        if (baseline.content !== before.content)
          summary.baselineChangedMessages++;
        if (message.content === baseline.content) summary.exactMatchMessages++;
        else {
          summary.differentMessages++;
          differences.push({
            subject: original.subject,
            provider: original.provider,
            messageId: message.id,
            before: before.content,
            baseline: baseline.content,
            codex: message.content,
          });
        }
      });
    });
  } catch (error) {
    summary.failed = true;
    console.error(
      error instanceof Error ? error.message : "Codex benchmark failed",
    );
  }
  await writeFile(
    path.join(outputDirectory, "differences.json"),
    JSON.stringify(differences, null, 2),
    { mode: 0o600 },
  );
  await writeFile(
    path.join(outputDirectory, "summary.json"),
    JSON.stringify(
      { ...summary, wallElapsedMs: Date.now() - wallStarted },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(summary));
  if (summary.failed) {
    process.exitCode = 1;
    break;
  }
}
