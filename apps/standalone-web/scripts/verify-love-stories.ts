// Consequential checks: private-record ownership, lost edits, duplicate captures,
// original-text preservation, ordering, account transfer and deletion. Static
// types and existing upload tests do not exercise these new database boundaries.
// Runs only against the isolated experiment, with disposable fictional users.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import postgres from "postgres";
import { chromium } from "@playwright/test";
import type { DomainClient } from "../src/server/domains/router";

assert.equal(process.env.EXPERIMENT_MODE, "1");
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname,
  "ep-super-hill-ag6qwuno-pooler.c-2.eu-central-1.aws.neon.tech",
);
assert.equal(
  new URL(process.env.DATABASE_URL_UNPOOLED!).hostname,
  "ep-super-hill-ag6qwuno.c-2.eu-central-1.aws.neon.tech",
);
const base = process.env.EXPERIMENT_BASE_URL ?? "http://localhost:3200";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const sql = postgres(process.env.DATABASE_URL_UNPOOLED!, { max: 1 });
const users: string[] = [];
function client(cookie = ""): DomainClient {
  return createORPCClient(
    new RPCLink({ url: "/api/domain", origin: base, headers: { cookie } }),
  );
}
async function denied(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(
    fn,
    (e: unknown) =>
      !!e && typeof e === "object" && "code" in e && e.code === code,
  );
}
async function account() {
  const nonce = randomUUID().replaceAll("-", "");
  const response = await fetch(base + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      name: "Fictional Love Stories QA",
      email: `love-${nonce}@example.invalid`,
      username: `love_${nonce.slice(0, 16)}`,
      password: randomUUID(),
    }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { user: { id: string } };
  users.push(body.user.id);
  const cookie = response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { id: body.user.id, cookie, api: client(cookie).loveStories };
}
try {
  await denied(() => client().loveStories.person.list({}), "UNAUTHORIZED");
  const a = await account();
  const b = await account();
  const key = randomUUID();
  const p = await a.api.person.create({
    requestId: key,
    displayName: "Mira (fictional)",
    ageAtFirstMeeting: 28,
    myAgeAtFirstMeeting: 30,
    occupation: "Email marketing",
    workArrangement: "remote",
    currentResidenceCity: "Austin",
    nationalityCodes: ["US"],
  });
  const retry = await a.api.person.create({
    requestId: key,
    displayName: "Mira (fictional)",
    ageAtFirstMeeting: 28,
    myAgeAtFirstMeeting: 30,
    occupation: "Email marketing",
    workArrangement: "remote",
    currentResidenceCity: "Austin",
    nationalityCodes: ["US"],
  });
  assert.equal(retry.id, p.id);
  await denied(
    () => a.api.person.create({ requestId: key, displayName: "Changed" }),
    "CONFLICT",
  );
  const foreign = await b.api.person.create({
    requestId: randomUUID(),
    displayName: "Other owner",
  });
  await denied(() => b.api.person.get({ id: p.id }), "NOT_FOUND");
  await denied(
    () =>
      b.api.person.update({
        id: p.id,
        version: p.version,
        changes: { displayName: "No" },
      }),
    "NOT_FOUND",
  );
  await denied(
    () => b.api.person.delete({ id: p.id, version: p.version }),
    "NOT_FOUND",
  );
  const updated = await a.api.person.update({
    id: p.id,
    version: p.version,
    changes: { occupation: null, chemistry: 7 },
  });
  assert.equal(updated.occupation, null);
  assert.equal(updated.ageAtFirstMeeting, 28);
  await denied(
    () =>
      a.api.person.update({
        id: p.id,
        version: p.version,
        changes: { summary: "Stale" },
      }),
    "CONFLICT",
  );
  await denied(
    () =>
      a.api.person.update({
        id: p.id,
        version: updated.version,
        changes: { workArrangement: "hybrid", remoteRegion: "worldwide" },
      }),
    "BAD_REQUEST",
  );
  await denied(
    () =>
      a.api.encounter.create({
        requestId: randomUUID(),
        personId: foreign.id,
        description: "Forbidden",
      }),
    "NOT_FOUND",
  );
  const [e1, e2] = await Promise.all([
    a.api.encounter.create({
      requestId: randomUUID(),
      personId: p.id,
      kind: "approach",
      medium: "messaging",
      platform: "instagram",
      status: "completed",
      description: "A fictional DM",
      timeContext: { label: "One evening", precision: "approximate" },
      mapUrl: "https://maps.google.com/?q=Austin",
    }),
    a.api.encounter.create({
      requestId: randomUUID(),
      personId: p.id,
      kind: "date",
      status: "completed",
      description: "Fictional coffee",
    }),
  ]);
  assert.notEqual(e1.position, e2.position);
  await denied(() => b.api.encounter.list({ personId: p.id }), "NOT_FOUND");
  await denied(
    () =>
      b.api.encounter.update({
        id: e1.id,
        version: e1.version,
        changes: { reflection: "No" },
      }),
    "NOT_FOUND",
  );
  await denied(
    () => b.api.encounter.delete({ id: e1.id, version: e1.version }),
    "NOT_FOUND",
  );
  await denied(
    () =>
      a.api.encounter.create({
        requestId: randomUUID(),
        personId: p.id,
        mapUrl: "javascript:alert(1)",
      }),
    "BAD_REQUEST",
  );
  const list = await a.api.encounter.list({ personId: p.id });
  await a.api.encounter.reorder({
    personId: p.id,
    items: [...list].reverse().map(({ id, version }) => ({ id, version })),
  });
  const ordered = await a.api.encounter.list({ personId: p.id });
  assert.deepEqual(
    ordered.map((e) => e.id),
    [...list].reverse().map((e) => e.id),
  );
  await denied(
    () =>
      a.api.encounter.reorder({
        personId: p.id,
        items: list.map(({ id, version }) => ({ id, version })),
      }),
    "CONFLICT",
  );
  await denied(
    () => a.api.encounter.reorder({ personId: p.id, items: [] }),
    "CONFLICT",
  );
  const raw = "  A fictional reflection.\nKeep my exact words.  ";
  const capture = {
    requestId: randomUUID(),
    body: raw,
    sourceKind: "typed" as const,
    personIds: [p.id],
    encounterIds: [e1.id, e2.id],
  };
  const en = await a.api.entry.create(capture);
  assert.equal((await a.api.entry.create(capture)).id, en.id);
  await a.api.entry.create({
    requestId: randomUUID(),
    body: "A second reflection",
    sourceKind: "typed",
    encounterIds: [e1.id],
  });
  assert.equal((await a.api.entry.list({ encounterId: e1.id })).length, 2);
  await denied(() => b.api.entry.get({ id: en.id }), "NOT_FOUND");
  await denied(
    () =>
      b.api.entry.update({
        id: en.id,
        version: en.version,
        changes: { body: "No" },
      }),
    "NOT_FOUND",
  );
  await denied(
    () => b.api.entry.delete({ id: en.id, version: en.version }),
    "NOT_FOUND",
  );
  await denied(
    () =>
      a.api.entry.update({
        id: en.id,
        version: en.version,
        changes: { body: "Must roll back", personIds: [foreign.id] },
      }),
    "NOT_FOUND",
  );
  assert.equal((await a.api.entry.get({ id: en.id })).body, raw);
  await a.api.entry.update({
    id: en.id,
    version: en.version,
    changes: { body: "Corrected wording", personIds: [] },
  });
  const read = await a.api.entry.get({ id: en.id });
  assert.equal(read.originalBody, raw);
  assert.deepEqual(read.personIds, []);
  assert.equal(read.encounterIds.length, 2);
  const exported = await a.api.export();
  assert.equal(exported.people.length, 1);
  assert.equal(exported.entries.length, 2);
  assert.equal((await b.api.export()).entries.length, 0);
  console.log(
    "PASS: ownership, replay keys, partial edits, stale conflicts, ordering, links, source preservation, export",
  );

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 960 },
    });
    await context.addCookies(
      a.cookie.split("; ").map((part) => {
        const [name, ...rest] = part.split("=");
        return { name: name!, value: rest.join("="), url: base };
      }),
    );
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/experiments/love-stories/workspace");
    await page
      .getByRole("button", { name: "Mira (fictional)", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Encounters", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Add encounter", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Kind", exact: true }).click();
    await page.getByRole("option", { name: "Message", exact: true }).click();
    await page.getByRole("combobox", { name: "Medium", exact: true }).click();
    await page.getByRole("option", { name: "Messaging", exact: true }).click();
    await page
      .getByLabel("Platform (Instagram, WhatsApp, etc.)", { exact: true })
      .fill("instagram");
    await page
      .getByLabel("What happened", { exact: true })
      .fill("Fictional browser persistence check");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByText("Fictional browser persistence check", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Mira (fictional)", exact: true })
      .click();
    await page
      .getByText("Fictional browser persistence check", { exact: true })
      .waitFor();
    await page.getByText("Corrected wording", { exact: true }).waitFor();
    assert.equal(await page.locator(".ph-no-capture.amp-block").count(), 1);
    await page.screenshot({
      path: "/tmp/love-stories-workspace-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "/tmp/love-stories-workspace-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: browser save/reload, replay exclusion, desktop/mobile layout",
    );
  } finally {
    await browser.close();
  }

  // Exercise the actual transfer helper with disposable source/target accounts.
  const { withTransaction } = await import("../src/server/db");
  const { transferLoveStoriesInTx } =
    await import("../src/server/services/love-stories/service");
  await withTransaction((tx) => transferLoveStoriesInTx(tx, a.id, b.id));
  assert.equal((await a.api.person.list({})).length, 0);
  assert.equal((await b.api.person.get({ id: p.id })).userId, b.id);
  assert.ok((await b.api.encounter.list({ personId: p.id })).length >= 3);
  assert.equal((await b.api.entry.get({ id: en.id })).encounterIds.length, 2);
  await denied(() => a.api.entry.get({ id: en.id }), "NOT_FOUND");
  const snapshot = await b.api.export();
  await sql`delete from "user" where id=${b.id}`;
  for (const table of ["love_person", "love_encounter", "love_entry"]) {
    const rows =
      await sql`select count(*)::int as count from ${sql(table)} where user_id=${b.id}`;
    assert.equal(rows[0]!.count, 0);
  }
  const links =
    await sql`select count(*)::int as count from love_entry_encounter where entry_id in ${sql(snapshot.entries.map((e) => e.id))}`;
  assert.equal(links[0]!.count, 0);
  console.log(
    "PASS: account transfer retains links; account deletion cascades private records",
  );
} finally {
  if (users.length) await sql`delete from "user" where id in ${sql(users)}`;
  await sql.end();
}
