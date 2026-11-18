/* eslint-disable @typescript-eslint/await-thenable -- Bun promise matchers are awaited at runtime. */
import { expect, mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  makeReceipt,
  researchConversation,
  isCurrent,
} from "../text-redaction-state";

// The real store SQL runs against ephemeral PostgreSQL, without production
// credentials. Only the network transport is replaced. Run in its own process
// so the Neon mock cannot affect unrelated application tests.
const pg = await PGlite.create();
let failReceiptWrite = false;
const query = async (text: string, params: unknown[] = []) => {
  if (failReceiptWrite && text.startsWith("UPDATE match SET text_redaction"))
    throw new Error("Injected receipt failure");
  const result = await pg.query<Record<string, unknown>>(text, params);
  return {
    rows: result.rows,
    rowCount: result.affectedRows ?? result.rows.length,
  };
};
await mock.module("@neondatabase/serverless", () => ({
  neonConfig: {},
  neon:
    () =>
    async (text: string | TemplateStringsArray, ...values: unknown[]) => {
      if (typeof text === "string")
        return (await query(text, values[0] as unknown[])).rows;
      const statement = text.reduce(
        (all, part, index) => all + (index ? `$${index}` : "") + part,
        "",
      );
      return (await query(statement, values)).rows;
    },
  Pool: class {
    async connect() {
      return {
        query,
        release() {
          return undefined;
        },
      };
    }
    async end() {
      return undefined;
    }
  },
}));
const { createTextStore } =
  await import("@/scripts/llm-analysis/text-redaction-store");
const store = createTextStore("postgresql://test:test@localhost/test");
try {
  await pg.exec(`
    CREATE TABLE tinder_profile (tinder_id text primary key);
    CREATE TABLE hinge_profile (hinge_id text primary key);
    CREATE TABLE match (id text primary key, tinder_profile_id text REFERENCES tinder_profile, hinge_profile_id text REFERENCES hinge_profile);
    CREATE TABLE message (id text primary key, match_id text REFERENCES match, content text NOT NULL, content_raw text NOT NULL,
      content_sanitized text, "order" integer, sent_date_raw text, message_type text);
    INSERT INTO tinder_profile VALUES ('tinder-source');
    INSERT INTO hinge_profile VALUES ('hinge-source');
    INSERT INTO match VALUES ('t-match', 'tinder-source', null), ('h-match', null, 'hinge-source');
    INSERT INTO message VALUES
      ('t-msg','t-match','my insta is test_handle','ORIGINAL TINDER',null,0,'2026-11-18','TEXT'),
      ('h-msg','h-match','hello','ORIGINAL HINGE',null,0,'2026-11-18','TEXT');
  `);
  await pg.exec(
    await readFile("drizzle/0019_message_text_redaction_receipts.sql", "utf8"),
  );
  const tinder = {
    sourceId: "tinder-source",
    provider: "TINDER" as const,
    profileId: "ali-t",
  };
  const hinge = {
    sourceId: "hinge-source",
    provider: "HINGE" as const,
    profileId: "ali-h",
  };
  expect(await store.preflight([tinder, hinge])).toEqual({
    profiles: 2,
    conversations: 2,
    nonemptyConversations: 2,
    messages: 2,
    unsanitized_messages: 2,
  });
  await expect(
    store.preflight([{ ...tinder, sourceId: "missing" }]),
  ).rejects.toThrow("missing");
  expect((await store.pendingMembers()).length).toBe(2);
  const initial = (await store.page(tinder, ""))[0]!;
  expect(() =>
    researchConversation(
      tinder,
      initial.source,
      initial.sanitized,
      initial.receipt,
    ),
  ).toThrow("blocked");
  const sanitized = {
    ...initial.source,
    messages: initial.source.messages.map((m) => ({
      ...m,
      content: "my insta is [INSTAGRAM_HANDLE]",
    })),
  };
  const receipt = makeReceipt(initial.source, sanitized, 0.9);

  // A failure after writing message text must roll back both the text and receipt.
  failReceiptWrite = true;
  await expect(
    store.save(tinder, initial.source, sanitized, receipt),
  ).rejects.toThrow("Injected");
  failReceiptWrite = false;
  expect((await store.page(tinder, ""))[0]!.sanitized).toBeNull();
  await store.save(tinder, initial.source, sanitized, receipt);
  const saved = (await store.page(tinder, ""))[0]!;
  expect(isCurrent(saved.source, saved.sanitized, saved.receipt)).toBe(true);
  const exported = JSON.stringify(
    researchConversation(tinder, saved.source, saved.sanitized, saved.receipt),
  );
  expect(exported).toContain("ali-t");
  expect(exported).not.toContain("test_handle");
  expect(exported).not.toContain("tinder-source");
  expect(
    (
      await pg.query<{ content_raw: string }>(
        "SELECT content_raw FROM message WHERE id='t-msg'",
      )
    ).rows[0]!.content_raw,
  ).toBe("ORIGINAL TINDER");

  // Screen-negative conversations are explicitly completed unchanged.
  const h = (await store.page(hinge, ""))[0]!;
  await store.save(
    hinge,
    h.source,
    h.source,
    makeReceipt(h.source, h.source, 0.01),
  );
  expect((await store.pendingMembers()).length).toBe(0);
  expect((await store.page(tinder, "t-match")).length).toBe(0);

  // A message arriving during model inference invalidates the whole context.
  await pg.exec(
    `INSERT INTO message VALUES ('t-new','t-match','and that is my snap','new original',null,1,'2026-11-18','TEXT')`,
  );
  await expect(
    store.save(tinder, initial.source, sanitized, receipt),
  ).rejects.toThrow("Source changed");
  const stale = (await store.page(tinder, ""))[0]!;
  expect(() =>
    researchConversation(tinder, stale.source, stale.sanitized, stale.receipt),
  ).toThrow("blocked");
  expect((await store.pendingMembers()).length).toBe(1);
  await expect(
    store.save(
      { ...tinder, sourceId: "other-owner" },
      initial.source,
      sanitized,
      receipt,
    ),
  ).rejects.toThrow("Source changed");
  console.log(
    "Text-store integration passed: both providers, migration, rollback, freshness, ownership, pending selection and export exclusion",
  );
} finally {
  await store.close();
  await pg.close();
}
