import { open, readFile } from "node:fs/promises";
import { z } from "zod";
import {
  JEV_INPUT_USD_PER_MILLION,
  JEV_SCREENING_POLICY,
  modelInput,
  type Conversation,
} from "./text-redaction";
import { digest, TEXT_PIPELINE } from "./text-redaction-state";

// A single Noul request has a documented 32k per-question context limit.
// Reserve the whole limit before sending, including ambiguous failures. Never
// enable long context here without updating this bound and the budget tests.
export const JEV_REQUEST_RESERVE_USD =
  (32768 * JEV_INPUT_USD_PER_MILLION) / 1e6;
type Event = { id: string; charge: number };
export class JevBudget {
  private charges = new Map<string, number>();
  private total = 0;
  constructor(
    private file: string,
    readonly cap = 30,
  ) {
    if (!Number.isFinite(cap) || cap <= 0 || cap > 30)
      throw new Error("Jev cap must be greater than zero and at most $30");
  }
  async load() {
    this.charges.clear();
    this.total = 0;
    try {
      const lines = (await readFile(this.file, "utf8"))
        .split("\n")
        .filter(Boolean);
      for (const line of lines) {
        const entry = z
          .object({ id: z.string(), charge: z.number().nonnegative() })
          .parse(JSON.parse(line));
        this.total += entry.charge - (this.charges.get(entry.id) ?? 0);
        this.charges.set(entry.id, entry.charge);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  get spent() {
    return this.total;
  }
  private async record(event: Event) {
    const file = await open(this.file, "a", 0o600);
    try {
      await file.writeFile(JSON.stringify(event) + "\n");
      await file.sync();
    } finally {
      await file.close();
    }
    this.total += event.charge - (this.charges.get(event.id) ?? 0);
    this.charges.set(event.id, event.charge);
  }
  async reserve() {
    if (this.spent + JEV_REQUEST_RESERVE_USD > this.cap)
      throw new Error(
        "Jev budget cap reached; resume after reviewing the usage ledger",
      );
    const id = crypto.randomUUID();
    await this.record({ id, charge: JEV_REQUEST_RESERVE_USD });
    return id;
  }
  async settle(id: string, inputTokens: number) {
    if (
      !this.charges.has(id) ||
      !Number.isInteger(inputTokens) ||
      inputTokens < 0 ||
      inputTokens > 32768
    )
      throw new Error("Unexpected Jev usage; reserved charge retained");
    await this.record({
      id,
      charge: (inputTokens * JEV_INPUT_USD_PER_MILLION) / 1e6,
    });
  }
}

class JevHttpError extends Error {
  constructor(readonly status: number) {
    super(`Jev HTTP ${status}; reserved charge retained`);
  }
}

function isTransient(error: unknown): boolean {
  if (error instanceof JevHttpError)
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    error.name === "TimeoutError" ||
    [
      "ECONNRESET",
      "ECONNREFUSED",
      "EPIPE",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "UND_ERR_SOCKET",
      "UND_ERR_CONNECT_TIMEOUT",
    ].includes(code ?? "") ||
    (error.cause !== undefined && isTransient(error.cause))
  );
}

const screenResponse = z.object({
  model: z.literal(TEXT_PIPELINE.jev),
  answers: z.object({
    contains_identifiers: z.object({ noul: z.number().min(0).max(1) }),
  }),
  usage: z.object({ input_tokens: z.number().int().nonnegative() }),
});

export async function screenWithBudget(
  conversation: Conversation,
  budget: JevBudget,
  apiKey: string,
  dependencies: {
    fetch?: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
) {
  const request = dependencies.fetch ?? fetch;
  const sleep =
    dependencies.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let attempt = 0; attempt < 5; attempt++) {
    // Each retry may have reached the provider. Retain failed reservations and
    // reserve separately before another request, including after a restart.
    const id = await budget.reserve();
    let value: z.infer<typeof screenResponse>;
    try {
      const response = await request("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TEXT_PIPELINE.jev,
          state: modelInput([conversation]),
          questions: {
            contains_identifiers: {
              type: "noul",
              instructions: JEV_SCREENING_POLICY,
            },
          },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new JevHttpError(response.status);
      }
      value = screenResponse.parse(await response.json());
    } catch (error) {
      if (!isTransient(error) || attempt === 4) throw error;
      const delayMs = 2000 * 2 ** attempt;
      console.warn(
        JSON.stringify({
          event: "jev_retry",
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          delayMs,
          reason:
            error instanceof JevHttpError
              ? `HTTP ${error.status}`
              : "connection-or-timeout",
          reservedChargeRetained: true,
        }),
      );
      await sleep(delayMs);
      continue;
    }
    // Ledger/validation failures must stop the worker, not trigger another call.
    await budget.settle(id, value.usage.input_tokens);
    return {
      inputDigest: digest(conversation),
      score: value.answers.contains_identifiers.noul,
    };
  }
  throw new Error("Jev retry limit reached");
}
