import { expect, test } from "bun:test";
import { applyCodexBatch } from "./text-redaction-codex";
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
