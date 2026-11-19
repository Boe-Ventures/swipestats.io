import { rejects } from "node:assert/strict";
import { expect, test } from "bun:test";
import { applyCodexBatch, validatedCodexBatch } from "./text-redaction-codex";
import type { Conversation } from "./text-redaction";

const conversations: Conversation[] = ["a", "b"].map((id) => ({
  id,
  messages: [
    {
      id: `${id}-message`,
      content: "My insta is sample_user",
      order: 0,
      sentDate: "2026-11-16",
      messageType: "TEXT",
    },
  ],
}));

// The single-conversation suite cannot catch silent omission or identity mixing
// introduced by batching. Either could publish unprocessed private messages.
test("Codex batches reject missing, duplicate, or foreign conversations", () => {
  for (const ids of [["a"], ["a", "a"], ["a", "foreign"]]) {
    expect(() =>
      applyCodexBatch(conversations, {
        conversations: ids.map((id) => ({ id, replacements: [] })),
      }),
    ).toThrow("every conversation exactly once");
  }
});

test("Codex batching preserves order and refuses quotes assigned across conversations", () => {
  const replacement = {
    messageId: "a-message",
    occurrence: 0,
    original: "sample_user",
    network: "INSTAGRAM",
    locationScope: null,
    category: "SOCIAL_CONTACT",
  };
  const result = applyCodexBatch(conversations, {
    conversations: [
      { id: "b", replacements: [] },
      { id: "a", replacements: [replacement] },
    ],
  });
  expect(result[0]!.messages[0]!.content).toBe(
    "My insta is [INSTAGRAM_HANDLE]",
  );
  expect(result[1]).toEqual(conversations[1]);
  expect(() =>
    applyCodexBatch(conversations, {
      conversations: [
        { id: "a", replacements: [] },
        { id: "b", replacements: [replacement] },
      ],
    }),
  ).toThrow("Invalid message identity");
});

// Existing validation tests do not prove recovery keeps rejecting incomplete or
// misassigned private text, bounds subscription retries, or stops on quota errors.
test("Codex recovery validates every retry and accounts for rejected response usage", async () => {
  const usage = { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 };
  let calls = 0;
  const result = await validatedCodexBatch(conversations, async () => {
    calls++;
    const rows =
      calls === 1
        ? [
            { id: "a", replacements: [] },
            { id: "foreign", replacements: [] },
          ]
        : [
            { id: "b", replacements: [] },
            {
              id: "a",
              replacements: [
                {
                  messageId: "a-message",
                  occurrence: 0,
                  original: calls === 2 ? "invented_quote" : "sample_user",
                  network: "INSTAGRAM",
                  locationScope: null,
                  category: "SOCIAL_CONTACT",
                },
              ],
            },
          ];
    return { response: JSON.stringify({ conversations: rows }), usage };
  });
  expect(calls).toBe(3);
  expect(result.redacted[0]!.messages[0]!.content).toBe(
    "My insta is [INSTAGRAM_HANDLE]",
  );
  expect(result.redacted[1]).toEqual(conversations[1]);
  expect(result.usage).toEqual({
    input_tokens: 30,
    cached_input_tokens: 6,
    output_tokens: 9,
  });
});

test("Codex recovery stops after invalid results and never retries provider failures", async () => {
  const usage = { input_tokens: 10, cached_input_tokens: 0, output_tokens: 1 };
  let calls = 0;
  await rejects(
    validatedCodexBatch(conversations, async () => {
      calls++;
      return {
        response: calls === 1 ? "{" : JSON.stringify({ conversations: [] }),
        usage,
      };
    }),
    /failed validation after 3 attempts/,
  );
  expect(calls).toBe(3);
  calls = 0;
  await rejects(
    validatedCodexBatch(conversations, async () => {
      calls++;
      throw new Error("Subscription quota exhausted");
    }),
    /Subscription quota exhausted/,
  );
  expect(calls).toBe(1);
});
