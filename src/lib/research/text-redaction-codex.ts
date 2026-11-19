import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  applyQuotedReplacements,
  modelInput,
  REDACTION_SYSTEM_PROMPT,
  replacementsSchema,
  TEXT_REDACTION_VERSION,
  type Conversation,
} from "./text-redaction";

const batchSchema = z.object({
  conversations: z.array(
    z.object({
      id: z.string(),
      replacements: replacementsSchema.shape.replacements,
    }),
  ),
});

export function applyCodexBatch(conversations: Conversation[], value: unknown) {
  const parsed = batchSchema.parse(value);
  const ids = new Set(parsed.conversations.map((item) => item.id));
  if (
    new Set(conversations.map((item) => item.id)).size !==
      conversations.length ||
    ids.size !== parsed.conversations.length ||
    ids.size !== conversations.length ||
    conversations.some((item) => !ids.has(item.id))
  )
    throw new Error(
      "Codex result must account for every conversation exactly once",
    );
  return conversations.map((conversation) => {
    const result = parsed.conversations.find(
      (item) => item.id === conversation.id,
    )!;
    return applyQuotedReplacements(conversation, result.replacements);
  });
}

export type CodexBatchResult = {
  fingerprint: string;
  redacted: Conversation[];
  elapsedMs: number;
  usage: {
    input_tokens: number;
    cached_input_tokens: number;
    output_tokens: number;
  };
};

// Retry only completed model responses that fail validation. Provider, quota,
// filesystem and tool-activity failures remain terminal, with no API fallback.
export async function validatedCodexBatch(
  conversations: Conversation[],
  generate: (attempt: number) => Promise<{
    response: string;
    usage: CodexBatchResult["usage"];
  }>,
) {
  if (
    !conversations.length ||
    new Set(conversations.map((c) => c.id)).size !== conversations.length
  )
    throw new Error("Codex input must contain distinct conversations");
  const usage = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const generated = await generate(attempt);
    for (const key of Object.keys(usage) as (keyof typeof usage)[])
      usage[key] += generated.usage[key];
    try {
      return {
        redacted: applyCodexBatch(
          conversations,
          JSON.parse(generated.response),
        ),
        usage,
      };
    } catch (cause) {
      if (attempt === 3)
        throw new Error(
          "Codex result failed validation after 3 attempts; no result accepted. Inspect private logs.",
          { cause },
        );
      console.warn(
        JSON.stringify({
          event: "codex-validation-retry",
          attempt,
          maxAttempts: 3,
          conversations: conversations.length,
        }),
      );
    }
  }
  throw new Error("Unreachable Codex retry state");
}

export function createCodexTextRedactor(options: {
  outputDirectory: string;
  model?: string;
  reasoning?: "low" | "medium" | "high";
}) {
  const model = options.model ?? "gpt-6.1-terra";
  const reasoning = options.reasoning ?? "medium";
  const configuration = {
    adapterVersion: 1,
    version: TEXT_REDACTION_VERSION,
    policy: REDACTION_SYSTEM_PROMPT,
    schema: z.toJSONSchema(batchSchema),
    model,
    reasoning,
  };
  async function redactBatch(conversations: Conversation[]) {
    if (JSON.stringify(modelInput(conversations)).length > 60000)
      throw new Error(
        "Codex batch exceeds 60000 characters; keep conversations intact",
      );
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ configuration, conversations }))
      .digest("hex");
    const directory = path.resolve(options.outputDirectory, fingerprint);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const checkpoint = path.join(directory, "completed.json");
    try {
      const cached = JSON.parse(
        await readFile(checkpoint, "utf8"),
      ) as CodexBatchResult;
      if (cached.fingerprint !== fingerprint)
        throw new Error("Codex checkpoint mismatch");
      return { ...cached, cached: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const started = Date.now();
    const validated = await validatedCodexBatch(
      conversations,
      async (attempt) => {
        const attemptDirectory = await mkdtemp(
          path.join(directory, "attempt-"),
        );
        const schemaPath = path.join(attemptDirectory, "schema.json");
        const resultPath = path.join(attemptDirectory, "response.json");
        const requestSchema = z.object({
          conversations: z
            .array(
              z.object({
                id: z.enum(
                  conversations.map((c) => c.id) as [string, ...string[]],
                ),
                replacements: replacementsSchema.shape.replacements,
              }),
            )
            .length(conversations.length),
        });
        await writeFile(
          schemaPath,
          JSON.stringify(z.toJSONSchema(requestSchema)),
          { mode: 0o600 },
        );
        await writeFile(resultPath, "", { mode: 0o600 });
        const prompt = `${REDACTION_SYSTEM_PROMPT}\nReturn exactly ${conversations.length} results, one for EVERY supplied conversation, including an empty replacements list when appropriate. Never mix context between conversations. Do not use tools, inspect files or execute commands. Only classify the supplied data and return schema-conforming JSON.\nRequired conversation IDs: ${JSON.stringify(conversations.map((c) => c.id))}. ${attempt > 1 ? "Previous response failed validation. Recheck every ID and exact quote before responding." : ""}\nCONVERSATION DATA:\n${JSON.stringify(modelInput(conversations))}`;
        // Keep subscription authentication, but never pass application/API credentials.
        const env = {
          NODE_ENV: process.env.NODE_ENV ?? "development",
          ...Object.fromEntries(
            [
              "PATH",
              "HOME",
              "TMPDIR",
              "CODEX_HOME",
              "LANG",
              "SSL_CERT_FILE",
              "SSL_CERT_DIR",
              "NIX_SSL_CERT_FILE",
              "HTTPS_PROXY",
              "HTTP_PROXY",
              "ALL_PROXY",
              "NO_PROXY",
              "https_proxy",
              "http_proxy",
              "all_proxy",
              "no_proxy",
              "WS_PROXY",
              "WSS_PROXY",
              "ws_proxy",
              "wss_proxy",
              "CODEX_NETWORK_PROXY_ACTIVE",
              "CODEX_SANDBOX_NETWORK_DISABLED",
            ]
              .filter((key) => process.env[key] !== undefined)
              .map((key) => [key, process.env[key]!]),
          ),
        };
        const child = spawn(
          "codex",
          [
            "exec",
            "--ephemeral",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--disable",
            "shell_tool",
            "--color",
            "never",
            "--json",
            "--model",
            model,
            "--config",
            `model_reasoning_effort="${reasoning}"`,
            "--config",
            'forced_login_method="chatgpt"',
            "--config",
            'model_provider="openai"',
            "--config",
            'approval_policy="never"',
            "--output-schema",
            schemaPath,
            "--output-last-message",
            resultPath,
            "--cd",
            attemptDirectory,
            "-",
          ],
          { env, stdio: ["pipe", "pipe", "pipe"] },
        );
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        child.stdin.on("error", () => undefined);
        child.stdin.end(prompt);
        const timeout = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, 180000);
        let code: number | null;
        try {
          code = await new Promise<number | null>((resolve, reject) => {
            child.on("error", reject);
            child.on("close", resolve);
          });
        } finally {
          clearTimeout(timeout);
        }
        await writeFile(path.join(attemptDirectory, "events.jsonl"), stdout, {
          mode: 0o600,
        });
        await writeFile(path.join(attemptDirectory, "stderr.log"), stderr, {
          mode: 0o600,
        });
        if (timedOut || code !== 0)
          throw new Error(
            `Codex ${timedOut ? "timed out" : `exited ${code}`}; inspect private logs. No API fallback.`,
          );
        const events = stdout
          .split("\n")
          .filter(Boolean)
          .map(
            (line) =>
              JSON.parse(line) as {
                type: string;
                item?: { type: string };
                usage?: CodexBatchResult["usage"];
              },
          );
        if (
          events.some(
            (event) =>
              event.item &&
              !["agent_message", "reasoning"].includes(event.item.type),
          )
        )
          throw new Error(
            "Unexpected Codex tool activity; inspect private logs",
          );
        const completed = events
          .slice()
          .reverse()
          .find((event) => event.type === "turn.completed");
        if (!completed?.usage)
          throw new Error("Codex did not report completed usage");
        return {
          response: await readFile(resultPath, "utf8"),
          usage: completed.usage,
        };
      },
    );
    const result: CodexBatchResult = {
      fingerprint,
      redacted: validated.redacted,
      elapsedMs: Date.now() - started,
      usage: validated.usage,
    };
    await writeFile(`${checkpoint}.partial`, JSON.stringify(result), {
      mode: 0o600,
    });
    await rename(`${checkpoint}.partial`, checkpoint);
    return { ...result, cached: false };
  }
  return {
    configuration,
    redactBatch,
    async redact(conversation: Conversation) {
      return (await redactBatch([conversation])).redacted[0]!;
    },
  };
}
