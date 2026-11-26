/* eslint-disable @typescript-eslint/await-thenable -- Bun promise matchers are awaited at runtime. */
import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  JevBudget,
  JEV_REQUEST_RESERVE_USD,
  screenWithBudget,
} from "./text-redaction-budget";
import { TEXT_PIPELINE } from "./text-redaction-state";

const conversation = { id: "synthetic", messages: [] };
const reset = () =>
  Object.assign(new TypeError("Connection closed"), { code: "ECONNRESET" });

// Retries can otherwise spend beyond the cap or release reservations for calls
// the provider might have billed. Existing ledger tests do not exercise HTTP.
test("Jev retries transient failures while preserving every ambiguous charge", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "jev-retry-"));
  try {
    const file = path.join(dir, "ledger.jsonl");
    const budget = new JevBudget(file);
    let calls = 0;
    const delays: number[] = [];
    const result = await screenWithBudget(
      conversation,
      budget,
      "synthetic-key",
      {
        fetch: async () => {
          calls++;
          if (calls === 1) throw reset();
          if (calls === 2) return new Response("temporary", { status: 503 });
          return Response.json({
            model: TEXT_PIPELINE.jev,
            answers: { contains_identifiers: { noul: 0.1 } },
            usage: { input_tokens: 1000 },
          });
        },
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    );
    expect(result.score).toBe(0.1);
    expect(calls).toBe(3);
    expect(delays).toEqual([2000, 4000]);
    expect(budget.spent).toBeCloseTo(
      2 * JEV_REQUEST_RESERVE_USD + 0.000042,
      10,
    );
    const resumed = new JevBudget(file);
    await resumed.load();
    expect(resumed.spent).toBeCloseTo(budget.spent, 10);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("Jev retries are bounded and never bypass budget, authorization or response validation", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "jev-retry-stop-"));
  try {
    for (const kind of [
      "exhausted",
      "budget",
      "forbidden",
      "invalid",
    ] as const) {
      const budget = new JevBudget(
        path.join(dir, `${kind}.jsonl`),
        kind === "budget" ? JEV_REQUEST_RESERVE_USD * 1.5 : 30,
      );
      let calls = 0;
      await expect(
        screenWithBudget(conversation, budget, "synthetic-key", {
          fetch: async () => {
            calls++;
            if (kind === "forbidden")
              return new Response(
                new ReadableStream({
                  cancel() {
                    throw reset();
                  },
                }),
                { status: 403 },
              );
            if (kind === "invalid") return Response.json({ model: "wrong" });
            throw reset();
          },
          sleep: () => Promise.resolve(),
        }),
      ).rejects.toThrow();
      expect(calls).toBe(kind === "exhausted" ? 5 : 1);
      expect(budget.spent).toBeCloseTo(calls * JEV_REQUEST_RESERVE_USD, 10);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
