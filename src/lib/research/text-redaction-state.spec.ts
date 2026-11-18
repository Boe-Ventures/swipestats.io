/* eslint-disable @typescript-eslint/await-thenable -- Bun promise matchers are awaited at runtime. */
import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JevBudget, JEV_REQUEST_RESERVE_USD } from "./text-redaction-budget";
import {
  cohortSchema,
  isCurrent,
  makeReceipt,
  researchConversation,
} from "./text-redaction-state";
import type { Conversation } from "./text-redaction";

const member = {
  sourceId: "private-profile",
  profileId: "ali-existing-alias",
  provider: "TINDER" as const,
};
const source: Conversation = {
  id: "private-match",
  messages: [
    {
      id: "private-message",
      content: "Call 202-555-0100",
      order: 0,
      sentDate: "2026-11-16",
      messageType: "TEXT",
    },
  ],
};
const sanitized: Conversation = {
  ...source,
  messages: source.messages.map((m) => ({
    ...m,
    content: "Call [PHONE_NUMBER]",
  })),
};

// Existing quote tests do not protect the DB/export boundary: stale context or
// a raw fallback could expose contact details despite correct redaction itself.
test("exports require current complete receipts and explicitly exclude raw fields", () => {
  const receipt = makeReceipt(source, sanitized, 0.9);
  const text = JSON.stringify(
    researchConversation(member, source, sanitized, receipt),
  );
  expect(text).toContain("ali-existing-alias");
  expect(text).toContain("[PHONE_NUMBER]");
  expect(text).not.toContain("202-555-0100");
  expect(text).not.toContain("private-");
  expect(() => researchConversation(member, source, null, receipt)).toThrow(
    "blocked",
  );
  expect(() => researchConversation(member, source, sanitized, null)).toThrow(
    "blocked",
  );
  expect(() =>
    researchConversation(member, source, sanitized, {
      ...receipt,
      pipeline: "old",
    }),
  ).toThrow("blocked");
  expect(() =>
    researchConversation(
      member,
      {
        ...source,
        messages: [
          ...source.messages,
          { ...source.messages[0]!, id: "new", content: "that was my insta" },
        ],
      },
      sanitized,
      receipt,
    ),
  ).toThrow("blocked");
  expect(() => researchConversation(member, source, source, receipt)).toThrow(
    "blocked",
  );
  expect(isCurrent(source, source, makeReceipt(source, source, 0.01))).toBe(
    true,
  );
  expect(() =>
    makeReceipt(source, { ...sanitized, messages: [] }, 0.9),
  ).toThrow("metadata");
  expect(() =>
    cohortSchema.parse([member, { ...member, sourceId: "other" }]),
  ).toThrow("Duplicate");
});

// Billing resumes must include ambiguous/in-flight calls after a crash, rather
// than reset the budget or lose reservations. Static checks cannot catch this.
test("Jev cap survives crashes and never sends a request without room reserved", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "jev-budget-test-"));
  try {
    const filename = path.join(dir, "ledger.jsonl");
    const first = new JevBudget(filename, JEV_REQUEST_RESERVE_USD * 1.5);
    await first.load();
    const request = await first.reserve();
    const resumed = new JevBudget(filename, JEV_REQUEST_RESERVE_USD * 1.5);
    await resumed.load();
    expect(resumed.spent).toBeCloseTo(JEV_REQUEST_RESERVE_USD, 10);
    await expect(resumed.reserve()).rejects.toThrow("cap reached");
    await resumed.settle(request, 1000);
    await resumed.reserve();
    const again = new JevBudget(filename, JEV_REQUEST_RESERVE_USD * 1.5);
    await again.load();
    expect(again.spent).toBeCloseTo(resumed.spent, 10);
    await expect(again.settle(request, 999999)).rejects.toThrow(
      "reserved charge retained",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
