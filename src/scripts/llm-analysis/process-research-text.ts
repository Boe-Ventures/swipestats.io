import { parseArgs } from "node:util";
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  appendFile,
  writeFile,
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { hostname } from "node:os";
import { z } from "zod";
import { modelInput, type Conversation } from "@/lib/research/text-redaction";
import { createCodexTextRedactor } from "@/lib/research/text-redaction-codex";
import {
  JevBudget,
  screenWithBudget,
} from "@/lib/research/text-redaction-budget";
import {
  cohortSchema,
  digest,
  isCurrent,
  makeReceipt,
  researchConversation,
  TEXT_PIPELINE,
  TEXT_PIPELINE_DIGEST,
} from "@/lib/research/text-redaction-state";
import { createTextStore } from "./text-redaction-store";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    cohort: { type: "string" },
    output: { type: "string" },
    pending: { type: "boolean", default: false },
    write: { type: "boolean", default: false },
    "max-conversations": { type: "string", default: "1000" },
    "max-total-conversations": { type: "string" },
    "jev-cap": { type: "string", default: "30" },
  },
});
const command = positionals[0];
if (
  !["plan", "run", "export"].includes(command ?? "") ||
  !values.output ||
  Boolean(values.cohort) === values.pending
)
  throw new Error(
    "Usage: process-research-text.ts plan|run|export --cohort mapping.json|--pending --output private-directory [--write] [--max-conversations 1000] [--max-total-conversations 62110] [--jev-cap 30]",
  );
if (command === "run" && !values.write)
  throw new Error("Database persistence requires --write");
if (command === "export" && !values.cohort)
  throw new Error("Export requires the fixed research cohort mapping");
const connectionString = process.env.TEXT_REDACTION_DATABASE_URL;
if (!connectionString)
  throw new Error(
    "Set TEXT_REDACTION_DATABASE_URL explicitly; DATABASE_URL is never used as a fallback",
  );
const maxConversations = z.coerce
  .number()
  .int()
  .positive()
  .parse(values["max-conversations"]);
const maxTotalConversations = values["max-total-conversations"]
  ? z.coerce.number().int().positive().parse(values["max-total-conversations"])
  : Infinity;
if (Number.isFinite(maxTotalConversations) && !values.cohort)
  throw new Error("A total conversation checkpoint requires a fixed cohort");
const output = path.resolve(values.output);
await mkdir(output, { recursive: true, mode: 0o700 });
const lockFile = path.join(output, "worker.lock");
try {
  const lock = JSON.parse(await readFile(lockFile, "utf8")) as {
    pid: number;
    host: string;
  };
  if (lock.host !== hostname())
    throw new Error(
      "Worker lock belongs to another host; verify it has stopped",
    );
  try {
    process.kill(lock.pid, 0);
    throw new Error("A worker is already using this directory");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    await rm(lockFile);
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await writeFile(
  lockFile,
  JSON.stringify({ pid: process.pid, host: hostname() }),
  { flag: "wx", mode: 0o600 },
);
const store = createTextStore(connectionString);
try {
  const members = values.cohort
    ? cohortSchema.parse(JSON.parse(await readFile(values.cohort, "utf8")))
    : await store.pendingMembers();
  const binding = {
    database: digest([
      new URL(connectionString).hostname,
      new URL(connectionString).pathname,
    ]),
    selection: values.pending ? "pending-tinder-hinge" : digest(members),
    pipeline: TEXT_PIPELINE_DIGEST,
  };
  const manifestPath = path.join(output, "binding.json");
  try {
    if (
      digest(JSON.parse(await readFile(manifestPath, "utf8"))) !==
      digest(binding)
    )
      throw new Error(
        "Output directory belongs to another database, cohort or pipeline",
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(manifestPath, JSON.stringify(binding, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
  }
  if (!members.length) {
    console.log(JSON.stringify({ pendingProfiles: 0 }));
  } else if (command === "plan") {
    const counts = await store.preflight(members);
    const report = {
      ...counts,
      pipeline: TEXT_PIPELINE,
      estimatedJevUsd: (counts.nonemptyConversations * 0.046341666) / 1000,
      estimateNote:
        "Approximate sample-based estimate for nonempty conversations. Actual tokens are metered.",
      jevCap: Number(values["jev-cap"]),
      writes: false,
      modelCalls: 0,
    };
    await writeFile(
      path.join(output, "preflight.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(JSON.stringify(report));
  } else if (command === "export") {
    const before = await store.preflight(members);
    const temporary = path.join(output, "messages.partial.jsonl");
    const file = await open(temporary, "w", 0o600);
    let conversations = 0,
      messages = 0;
    try {
      await file.writeFile(
        JSON.stringify({
          type: "manifest",
          schema: "swipestats-message-supplement-v1",
          profiles: members.length,
          pipeline: TEXT_PIPELINE,
          createdAt: new Date().toISOString(),
          scope: "Stored outgoing messages only; not both sides of a chat",
        }) + "\n",
      );
      for (const member of members) {
        await file.writeFile(
          JSON.stringify({
            type: "profile",
            profileId: member.profileId,
            provider: member.provider,
          }) + "\n",
        );
        let after = "";
        while (true) {
          const page = await store.page(member, after);
          if (!page.length) break;
          for (const row of page) {
            const result = researchConversation(
              member,
              row.source,
              row.sanitized,
              row.receipt,
            );
            await file.writeFile(JSON.stringify(result) + "\n");
            conversations++;
            messages += result.messages.length;
          }
          after = page.at(-1)!.source.id;
        }
      }
      if (
        conversations !== before.conversations ||
        messages !== before.messages
      )
        throw new Error(
          "Cohort changed during export; rerun against a stable processed cohort",
        );
      await file.writeFile(
        JSON.stringify({
          type: "summary",
          profiles: members.length,
          conversations,
          messages,
        }) + "\n",
      );
      await file.sync();
    } catch (error) {
      await file.close();
      await rm(temporary, { force: true });
      throw error;
    }
    await file.close();
    const gzPartial = path.join(output, "messages.partial.jsonl.gz");
    await pipeline(
      createReadStream(temporary),
      createGzip(),
      createWriteStream(gzPartial, { mode: 0o600 }),
    );
    await rename(gzPartial, path.join(output, "messages.jsonl.gz"));
    await rm(temporary);
    console.log(
      JSON.stringify({
        profiles: members.length,
        conversations,
        messages,
        file: path.join(output, "messages.jsonl.gz"),
      }),
    );
  } else {
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey) throw new Error("TYPESAFE_API_KEY is required");
    const budget = new JevBudget(
      path.join(output, "jev-usage.jsonl"),
      Number(values["jev-cap"]),
    );
    await budget.load();
    const redactor = createCodexTextRedactor({
      outputDirectory: path.join(output, "codex"),
      model: TEXT_PIPELINE.redactor,
      reasoning: TEXT_PIPELINE.reasoning,
    });
    const summary = {
      completed: 0,
      alreadyCurrent: 0,
      screened: 0,
      cachedScreens: 0,
      oversized: 0,
      processedProfiles: 0,
    };
    let attempted = 0;
    const reachedLimit = () =>
      attempted >= maxConversations ||
      attempted + summary.alreadyCurrent >= maxTotalConversations;
    for (const member of members) {
      if (reachedLimit()) break;
      const screenFile = path.join(
        output,
        `screen-${digest([member.provider, member.sourceId])}.jsonl`,
      );
      const screens = new Map<string, number>();
      try {
        const input = createInterface({
          input: createReadStream(screenFile),
          crlfDelay: Infinity,
        });
        for await (const line of input) {
          const entry = z
            .object({
              inputDigest: z.string(),
              score: z.number().min(0).max(1),
            })
            .parse(JSON.parse(line));
          screens.set(entry.inputDigest, entry.score);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      let after = "";
      let batch: { source: Conversation; score: number }[] = [];
      let writes: Parameters<typeof store.saveBatch>[1] = [];
      const stage = (
        source: Conversation,
        sanitized: Conversation,
        score: number,
      ) => {
        writes.push({
          sanitized,
          receipt: makeReceipt(source, sanitized, score),
        });
      };
      const flush = async () => {
        if (!batch.length) return;
        const result = await redactor.redactBatch(
          batch.map((item) => item.source),
        );
        for (let i = 0; i < batch.length; i++)
          stage(batch[i]!.source, result.redacted[i]!, batch[i]!.score);
        batch = [];
      };
      while (!reachedLimit()) {
        const page = await store.page(member, after);
        if (!page.length) break;
        for (const row of page) {
          if (reachedLimit()) break;
          if (isCurrent(row.source, row.sanitized, row.receipt)) {
            summary.alreadyCurrent++;
            continue;
          }
          attempted++;
          const source = row.source;
          if (JSON.stringify(modelInput([source])).length > 60000) {
            summary.oversized++;
            await appendFile(
              path.join(output, "exceptions.jsonl"),
              JSON.stringify({
                subject: digest([member.provider, source.id]),
                reason: "over-60000-characters",
                inputDigest: digest(source),
              }) + "\n",
              { mode: 0o600 },
            );
            continue;
          }
          let score = source.messages.length ? screens.get(digest(source)) : 0;
          if (score === undefined) {
            const result = await screenWithBudget(source, budget, apiKey);
            await appendFile(screenFile, JSON.stringify(result) + "\n", {
              mode: 0o600,
            });
            score = result.score;
            screens.set(result.inputDigest, score);
            summary.screened++;
          } else summary.cachedScreens++;
          if (score < TEXT_PIPELINE.threshold) stage(source, source, score);
          else {
            if (
              batch.length >= 32 ||
              JSON.stringify(
                modelInput([...batch.map((item) => item.source), source]),
              ).length > 40000
            )
              await flush();
            batch.push({ source, score });
          }
        }
        await flush();
        await store.saveBatch(member, writes);
        summary.completed += writes.length;
        writes = [];
        after = page.at(-1)!.source.id;
        const progress = {
          ...summary,
          attempted,
          visited: attempted + summary.alreadyCurrent,
          totalLimit: Number.isFinite(maxTotalConversations)
            ? maxTotalConversations
            : null,
          updatedAt: new Date().toISOString(),
          jevChargedOrReservedUsd: budget.spent,
          cap: budget.cap,
        };
        await writeFile(
          path.join(output, "progress.partial.json"),
          JSON.stringify(progress),
          { mode: 0o600 },
        );
        await rename(
          path.join(output, "progress.partial.json"),
          path.join(output, "progress.json"),
        );
        console.log(JSON.stringify(progress));
      }
      summary.processedProfiles++;
    }
    await writeFile(
      path.join(output, "last-run.json"),
      JSON.stringify(
        {
          ...summary,
          attempted,
          jevChargedOrReservedUsd: budget.spent,
          cap: budget.cap,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        ...summary,
        attempted,
        jevChargedOrReservedUsd: budget.spent,
        cap: budget.cap,
      }),
    );
    if (summary.oversized) process.exitCode = 1;
  }
} finally {
  await store.close();
  await rm(lockFile, { force: true });
}
