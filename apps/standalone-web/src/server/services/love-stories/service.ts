import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, withTransaction, type TransactionClient } from "@/server/db";
import {
  lovePersonTable as person,
  loveSelfProfileTable as selfProfile,
  loveEncounterTable as encounter,
  loveEntryTable as entry,
  loveEntryPersonTable as entryPerson,
  loveEntryEncounterTable as entryEncounter,
  userTable,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { DomainError } from "@/server/domains/error";
import type {
  PersonFields,
  ProfileFields,
  EncounterFields,
  EntryFields,
  ImportTranscriptInput,
} from "@/lib/love-stories/model";
import { readTranscriptFile } from "./transcript";
import {
  personFields,
  profileFields,
  MAX_ENTRY_CHARACTERS,
} from "@/lib/love-stories/model";

function missing(): never {
  throw new DomainError({ code: "NOT_FOUND", message: "Record not found" });
}
function conflict(
  message = "This record changed. Reload before saving.",
): never {
  throw new DomainError({ code: "CONFLICT", message });
}
function bad(message: string): never {
  throw new DomainError({ code: "BAD_REQUEST", message });
}
function assertVersion(row: { version: number }, version: number) {
  if (row.version !== version) conflict();
}
// Stable across JSON key order; request keys reject changed payloads on retries.
function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function fingerprint(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function replay<T extends { requestHash: string }>(
  row: T | undefined,
  hash: string,
) {
  if (row && row.requestHash !== hash)
    conflict("This save key was already used for different content.");
  return row;
}
function publicRecord<T extends { requestId: string; requestHash: string }>(
  row: T,
) {
  const { requestId: _requestId, requestHash: _requestHash, ...record } = row;
  return record;
}
export async function lockLoveStoriesOwners(
  tx: TransactionClient,
  userIds: string[],
) {
  const owners = await tx
    .select({ id: userTable.id })
    .from(userTable)
    .where(inArray(userTable.id, [...new Set(userIds)]))
    .orderBy(asc(userTable.id))
    .for("update");
  if (owners.length !== new Set(userIds).size) missing();
}
async function write<T>(
  userId: string,
  fn: (tx: TransactionClient) => Promise<T>,
) {
  return withTransaction(async (tx) => {
    await lockLoveStoriesOwners(tx, [userId]);
    return fn(tx);
  });
}
async function ownedPerson(tx: TransactionClient, userId: string, id: string) {
  const [row] = await tx
    .select()
    .from(person)
    .where(and(eq(person.userId, userId), eq(person.id, id)));
  return row ?? missing();
}
async function ownedEncounter(
  tx: TransactionClient,
  userId: string,
  id: string,
) {
  const [row] = await tx
    .select()
    .from(encounter)
    .where(and(eq(encounter.userId, userId), eq(encounter.id, id)));
  return row ?? missing();
}
async function ownedEntry(tx: TransactionClient, userId: string, id: string) {
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(eq(entry.userId, userId), eq(entry.id, id)));
  return row ?? missing();
}
// Keep a description and its evidence together when resolving profile conflicts.
function preserveProfileAttribution(
  merged: Record<string, unknown>,
  keep: ProfileFields,
  source: ProfileFields,
) {
  const groups = [
    [
      "backgroundGroups",
      "backgroundDetail",
      "backgroundSource",
      "backgroundNotes",
    ],
    ["eyeColor", "eyeColorNotes"],
  ] as const;
  for (const keys of groups) {
    const winner = keys.some((key) => {
      const value = keep[key];
      return Array.isArray(value)
        ? value.length > 0
        : value != null && value !== "";
    })
      ? keep
      : source;
    for (const key of keys) merged[key] = winner[key];
  }
}
function validateProfile(value: ProfileFields) {
  if (
    value.originCountryCode &&
    value.additionalOriginCountryCodes?.includes(value.originCountryCode)
  )
    bad("Additional origins must differ from the primary origin.");
}
function validatePerson(value: Partial<PersonFields>) {
  validateProfile(value);
  if (value.remoteRegion && value.workArrangement !== "remote")
    bad("Remote region requires a remote work arrangement.");
}
async function validateEncounter(
  tx: TransactionClient,
  userId: string,
  personId: string,
  id: string,
  value: EncounterFields,
) {
  if (value.occurredAt && value.status && value.status !== "completed")
    bad("Use the planned date for encounters that have not happened.");
  const anchorId = value.timeContext?.relativeToEncounterId;
  if (value.timeContext?.offsetDays !== undefined && !anchorId)
    bad("A relative date needs an encounter reference.");
  if (anchorId) {
    if (anchorId === id) bad("An encounter cannot reference itself.");
    const anchor = await ownedEncounter(tx, userId, anchorId);
    if (anchor.personId !== personId)
      bad("The date reference must belong to the same person.");
  }
  const stopIds = value.stops?.map((stop) => stop.id) ?? [];
  if (new Set(stopIds).size !== stopIds.length)
    bad("Each stop needs a different ID.");
}
async function replaceLinks(
  tx: TransactionClient,
  userId: string,
  entryId: string,
  links: { personIds?: string[]; encounterIds?: string[] },
) {
  // Validate every target before replacing anything. All owner writes serialize
  // with account transfer, preventing a target from changing owners mid-link.
  for (const id of new Set(links.personIds ?? []))
    await ownedPerson(tx, userId, id);
  for (const id of new Set(links.encounterIds ?? []))
    await ownedEncounter(tx, userId, id);
  if (links.personIds !== undefined) {
    await tx.delete(entryPerson).where(eq(entryPerson.entryId, entryId));
    if (links.personIds.length)
      await tx.insert(entryPerson).values(
        [...new Set(links.personIds)].map((personId) => ({
          entryId,
          personId,
        })),
      );
  }
  if (links.encounterIds !== undefined) {
    await tx.delete(entryEncounter).where(eq(entryEncounter.entryId, entryId));
    if (links.encounterIds.length)
      await tx.insert(entryEncounter).values(
        [...new Set(links.encounterIds)].map((encounterId) => ({
          entryId,
          encounterId,
        })),
      );
  }
}
// Preserve long merge/transfer notes without exceeding the journal entry limit.
async function preserveNotes(
  tx: TransactionClient,
  userId: string,
  title: string,
  text: string,
  personId?: string,
) {
  let firstId: string | null = null;
  let remaining = text;
  while (remaining.length) {
    let end = Math.min(remaining.length, MAX_ENTRY_CHARACTERS);
    const last = remaining.charCodeAt(end - 1);
    if (end < remaining.length && last >= 0xd800 && last <= 0xdbff) end--;
    const body = remaining.slice(0, end);
    remaining = remaining.slice(end);
    const id = createId("lent");
    firstId ??= id;
    await tx.insert(entry).values({
      id,
      userId,
      title,
      body,
      originalBody: body,
      sourceKind: "import",
      requestId: randomUUID(),
      requestHash: fingerprint(body),
    });
    if (personId)
      await tx.insert(entryPerson).values({ entryId: id, personId });
  }
  return firstId;
}
export const loveStoriesService = {
  async getSelfProfile(userId: string) {
    const [row] = await db
      .select()
      .from(selfProfile)
      .where(eq(selfProfile.userId, userId));
    return row ?? null;
  },
  updateSelfProfile(
    userId: string,
    input: { version: number | null; changes: ProfileFields },
  ) {
    return write(userId, async (tx) => {
      const [current] = await tx
        .select()
        .from(selfProfile)
        .where(eq(selfProfile.userId, userId));
      if (current ? current.version !== input.version : input.version !== null)
        conflict();
      validateProfile({ ...current, ...input.changes });
      if (!current) {
        const [row] = await tx
          .insert(selfProfile)
          .values({ ...input.changes, userId })
          .returning();
        return row!;
      }
      const [row] = await tx
        .update(selfProfile)
        .set({
          ...input.changes,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(selfProfile.userId, userId))
        .returning();
      return row!;
    });
  },
  exportData(userId: string) {
    return write(userId, async (tx) => {
      const people = await tx
        .select()
        .from(person)
        .where(eq(person.userId, userId));
      const encounters = await tx
        .select()
        .from(encounter)
        .where(eq(encounter.userId, userId))
        .orderBy(asc(encounter.personId), asc(encounter.position));
      const entries = await tx
        .select()
        .from(entry)
        .where(eq(entry.userId, userId));
      const personLinks = await tx
        .select({
          entryId: entryPerson.entryId,
          personId: entryPerson.personId,
        })
        .from(entryPerson)
        .innerJoin(entry, eq(entry.id, entryPerson.entryId))
        .innerJoin(person, eq(person.id, entryPerson.personId))
        .where(and(eq(entry.userId, userId), eq(person.userId, userId)));
      const encounterLinks = await tx
        .select({
          entryId: entryEncounter.entryId,
          encounterId: entryEncounter.encounterId,
        })
        .from(entryEncounter)
        .innerJoin(entry, eq(entry.id, entryEncounter.entryId))
        .innerJoin(encounter, eq(encounter.id, entryEncounter.encounterId))
        .where(and(eq(entry.userId, userId), eq(encounter.userId, userId)));
      return {
        schemaVersion: 2,
        selfProfile:
          (
            await tx
              .select()
              .from(selfProfile)
              .where(eq(selfProfile.userId, userId))
          )[0] ?? null,
        exportedAt: new Date(),
        people: people.map(publicRecord),
        encounters: encounters.map(publicRecord),
        entries: entries.map(publicRecord),
        personLinks,
        encounterLinks,
      };
    });
  },
  async listPeople(
    userId: string,
    page: { limit: number; offset: number; query?: string },
  ) {
    const pattern = page.query?.trim()
      ? `%${page.query.trim().replace(/[\\%_]/g, "\\$&")}%`
      : undefined;
    const rows = await db
      .select({
        id: person.id,
        displayName: person.displayName,
        aliases: person.aliases,
        tagline: person.tagline,
        firstMetYear: person.firstMetYear,
        originCity: person.originCity,
        currentResidenceCity: person.currentResidenceCity,
        version: person.version,
        updatedAt: person.updatedAt,
      })
      .from(person)
      .where(
        and(
          eq(person.userId, userId),
          pattern
            ? or(
                ilike(person.displayName, pattern),
                sql`exists (select 1 from unnest(${person.aliases}) as a(name) where a.name ilike ${pattern})`,
              )
            : undefined,
        ),
      )
      .orderBy(desc(person.updatedAt), asc(person.id))
      .limit(page.limit)
      .offset(page.offset);
    return rows;
  },
  async getPerson(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(person)
      .where(and(eq(person.userId, userId), eq(person.id, id)));
    return publicRecord(row ?? missing());
  },
  createPerson(userId: string, input: PersonFields & { requestId: string }) {
    return write(userId, async (tx) => {
      const { requestId, ...fields } = input;
      const hash = fingerprint(fields);
      const [existing] = await tx
        .select()
        .from(person)
        .where(and(eq(person.userId, userId), eq(person.requestId, requestId)));
      const previous = replay(existing, hash);
      if (previous) return publicRecord(previous);
      validatePerson(fields);
      const [row] = await tx
        .insert(person)
        .values({
          ...fields,
          id: createId("lper"),
          userId,
          requestId,
          requestHash: hash,
        })
        .returning();
      return publicRecord(row!);
    });
  },
  updatePerson(
    userId: string,
    input: { id: string; version: number; changes: Partial<PersonFields> },
  ) {
    return write(userId, async (tx) => {
      const current = await ownedPerson(tx, userId, input.id);
      assertVersion(current, input.version);
      validatePerson({ ...current, ...input.changes });
      const [row] = await tx
        .update(person)
        .set({
          ...input.changes,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(person.userId, userId), eq(person.id, input.id)))
        .returning();
      return publicRecord(row!);
    });
  },
  deletePerson(userId: string, input: { id: string; version: number }) {
    return write(userId, async (tx) => {
      assertVersion(await ownedPerson(tx, userId, input.id), input.version);
      await tx
        .delete(person)
        .where(and(eq(person.userId, userId), eq(person.id, input.id)));
      return { success: true };
    });
  },
  mergePeople(
    userId: string,
    input: {
      keep: { id: string; version: number };
      merge: { id: string; version: number };
    },
  ) {
    return write(userId, async (tx) => {
      if (input.keep.id === input.merge.id) bad("Choose two different people.");
      const keep = await ownedPerson(tx, userId, input.keep.id);
      const source = await ownedPerson(tx, userId, input.merge.id);
      assertVersion(keep, input.keep.version);
      assertVersion(source, input.merge.version);

      const combined = Object.fromEntries(
        (Object.keys(personFields.shape) as (keyof PersonFields)[]).map(
          (key) => {
            const value = keep[key];
            const empty =
              value == null ||
              value === "" ||
              (Array.isArray(value) && value.length === 0);
            return [key, empty ? source[key] : value];
          },
        ),
      );
      preserveProfileAttribution(combined, keep, source);
      combined.additionalOriginCountryCodes =
        (combined.additionalOriginCountryCodes as string[] | null)?.filter(
          (code) => code !== combined.originCountryCode,
        ) ?? null;
      combined.aliases = [
        ...new Set([
          ...(keep.aliases ?? []),
          source.displayName,
          ...(source.aliases ?? []),
        ]),
      ].filter((name) => name !== keep.displayName);
      // A conflicting work arrangement follows the kept person's choice.
      if (combined.workArrangement !== "remote") combined.remoteRegion = null;
      const parsed = personFields.safeParse(combined);
      if (!parsed.success)
        bad(
          "The combined person exceeds a field limit. Update the people before merging.",
        );
      validatePerson(parsed.data);

      const sourceEncounters = await tx
        .select()
        .from(encounter)
        .where(
          and(eq(encounter.userId, userId), eq(encounter.personId, source.id)),
        )
        .orderBy(asc(encounter.position), asc(encounter.id));
      const [last] = await tx
        .select({ position: encounter.position })
        .from(encounter)
        .where(
          and(eq(encounter.userId, userId), eq(encounter.personId, keep.id)),
        )
        .orderBy(desc(encounter.position))
        .limit(1);
      for (const [index, row] of sourceEncounters.entries()) {
        await tx
          .update(encounter)
          .set({
            personId: keep.id,
            position: (last?.position ?? -1) + index + 1,
            version: row.version + 1,
            updatedAt: new Date(),
          })
          .where(and(eq(encounter.userId, userId), eq(encounter.id, row.id)));
      }

      const linkedEntries = await tx
        .select({ id: entry.id })
        .from(entry)
        .innerJoin(entryPerson, eq(entryPerson.entryId, entry.id))
        .where(
          and(eq(entry.userId, userId), eq(entryPerson.personId, source.id)),
        );
      if (linkedEntries.length) {
        await tx
          .insert(entryPerson)
          .values(
            linkedEntries.map(({ id }) => ({
              entryId: id,
              personId: keep.id,
            })),
          )
          .onConflictDoNothing();
        await tx
          .update(entry)
          .set({
            version: sql`${entry.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(entry.userId, userId),
              inArray(
                entry.id,
                linkedEntries.map(({ id }) => id),
              ),
            ),
          );
      }

      const notes = [
        ["Summary", source.summary],
        ["Contact context", source.contactContext],
        ["Appearance", source.appearance],
        ["Background", source.backgroundGroups?.join(", ")],
        ["Background detail", source.backgroundDetail],
        ["Background source", source.backgroundSource],
        ["Background notes", source.backgroundNotes],
        ["Eye color", source.eyeColor],
        ["Eye color notes", source.eyeColorNotes],
        ["Height description", source.heightCategory],
      ]
        .filter(([, value]) => value?.trim())
        .map(([label, value]) => `${label}\n${value}`)
        .join("\n\n");
      let preservedNotesEntryId: string | null = null;
      if (notes) {
        preservedNotesEntryId = await preserveNotes(
          tx,
          userId,
          `Notes merged from ${source.displayName}`,
          `Notes from the duplicate person ${source.displayName}, merged into ${keep.displayName}. These preserve the earlier account.\n\n${notes}`,
          keep.id,
        );
      }
      const [row] = await tx
        .update(person)
        .set({
          ...parsed.data,
          version: keep.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(person.userId, userId), eq(person.id, keep.id)))
        .returning();
      // Move every child before deleting: the source person's FK cascades must
      // never remove encounters or their linked journal entries.
      await tx
        .delete(person)
        .where(and(eq(person.userId, userId), eq(person.id, source.id)));
      return {
        person: publicRecord(row!),
        removedPersonId: source.id,
        movedEncounters: sourceEncounters.length,
        linkedEntries: linkedEntries.length,
        preservedNotesEntryId,
      };
    });
  },
  async listEncounters(
    userId: string,
    input: { personId: string; limit: number; offset: number },
  ) {
    await this.getPerson(userId, input.personId);
    const rows = await db
      .select()
      .from(encounter)
      .where(
        and(
          eq(encounter.userId, userId),
          eq(encounter.personId, input.personId),
        ),
      )
      .orderBy(asc(encounter.position), asc(encounter.id))
      .limit(input.limit)
      .offset(input.offset);
    return rows.map(publicRecord);
  },
  createEncounter(
    userId: string,
    input: EncounterFields & { personId: string; requestId: string },
  ) {
    return write(userId, async (tx) => {
      const { personId, requestId, ...fields } = input;
      const hash = fingerprint({ personId, ...fields });
      const [existing] = await tx
        .select()
        .from(encounter)
        .where(
          and(eq(encounter.userId, userId), eq(encounter.requestId, requestId)),
        );
      const previous = replay(existing, hash);
      if (previous) return publicRecord(previous);
      await ownedPerson(tx, userId, personId);
      const id = createId("lenc");
      await validateEncounter(tx, userId, personId, id, fields);
      const [last] = await tx
        .select({ position: encounter.position })
        .from(encounter)
        .where(
          and(eq(encounter.userId, userId), eq(encounter.personId, personId)),
        )
        .orderBy(desc(encounter.position))
        .limit(1);
      const [row] = await tx
        .insert(encounter)
        .values({
          ...fields,
          id,
          userId,
          personId,
          requestId,
          requestHash: hash,
          position: (last?.position ?? -1) + 1,
        })
        .returning();
      return publicRecord(row!);
    });
  },
  updateEncounter(
    userId: string,
    input: { id: string; version: number; changes: EncounterFields },
  ) {
    return write(userId, async (tx) => {
      const current = await ownedEncounter(tx, userId, input.id);
      assertVersion(current, input.version);
      await validateEncounter(tx, userId, current.personId, input.id, {
        ...current,
        ...input.changes,
      });
      const [row] = await tx
        .update(encounter)
        .set({
          ...input.changes,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(encounter.userId, userId), eq(encounter.id, input.id)))
        .returning();
      return publicRecord(row!);
    });
  },
  reorderEncounters(
    userId: string,
    input: { personId: string; items: { id: string; version: number }[] },
  ) {
    return write(userId, async (tx) => {
      await ownedPerson(tx, userId, input.personId);
      const rows = await tx
        .select()
        .from(encounter)
        .where(
          and(
            eq(encounter.userId, userId),
            eq(encounter.personId, input.personId),
          ),
        );
      const ids = new Set(input.items.map((item) => item.id));
      if (
        ids.size !== input.items.length ||
        rows.length !== ids.size ||
        rows.some((row) => !ids.has(row.id))
      )
        conflict("The encounter list changed. Reload before reordering.");
      const versions = new Map(
        input.items.map((item) => [item.id, item.version]),
      );
      for (const row of rows) assertVersion(row, versions.get(row.id)!);
      for (const [position, item] of input.items.entries())
        await tx
          .update(encounter)
          .set({ position, version: item.version + 1, updatedAt: new Date() })
          .where(and(eq(encounter.userId, userId), eq(encounter.id, item.id)));
      return { success: true };
    });
  },
  deleteEncounter(userId: string, input: { id: string; version: number }) {
    return write(userId, async (tx) => {
      assertVersion(await ownedEncounter(tx, userId, input.id), input.version);
      // Keep wording but remove references to a deleted relative-date anchor.
      await tx
        .update(encounter)
        .set({
          timeContext: sql`${encounter.timeContext} - 'relativeToEncounterId' - 'offsetDays'`,
          version: sql`${encounter.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(encounter.userId, userId),
            sql`${encounter.timeContext}->>'relativeToEncounterId' = ${input.id}`,
          ),
        );
      await tx
        .delete(encounter)
        .where(and(eq(encounter.userId, userId), eq(encounter.id, input.id)));
      return { success: true };
    });
  },
  async listEntries(
    userId: string,
    input: {
      personId?: string;
      encounterId?: string;
      limit: number;
      offset: number;
    },
  ) {
    const conditions = [eq(entry.userId, userId)];
    if (input.personId) {
      await this.getPerson(userId, input.personId);
      const direct = db
        .select({ id: entryPerson.entryId })
        .from(entryPerson)
        .where(eq(entryPerson.personId, input.personId));
      const throughEncounter = db
        .select({ id: entryEncounter.entryId })
        .from(entryEncounter)
        .innerJoin(encounter, eq(encounter.id, entryEncounter.encounterId))
        .where(
          and(
            eq(encounter.personId, input.personId),
            eq(encounter.userId, userId),
          ),
        );
      conditions.push(
        sql`(${entry.id} in (${direct}) or ${entry.id} in (${throughEncounter}))`,
      );
    }
    if (input.encounterId) {
      const [owned] = await db
        .select({ id: encounter.id })
        .from(encounter)
        .where(
          and(
            eq(encounter.id, input.encounterId),
            eq(encounter.userId, userId),
          ),
        );
      if (!owned) missing();
      conditions.push(
        inArray(
          entry.id,
          db
            .select({ id: entryEncounter.entryId })
            .from(entryEncounter)
            .where(eq(entryEncounter.encounterId, input.encounterId)),
        ),
      );
    }
    const rows = await db
      .select({
        id: entry.id,
        title: entry.title,
        sourceKind: entry.sourceKind,
        version: entry.version,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })
      .from(entry)
      .where(and(...conditions))
      .orderBy(desc(entry.createdAt), asc(entry.id))
      .limit(input.limit)
      .offset(input.offset);
    return rows;
  },
  async getEntry(userId: string, id: string) {
    const [row] = await db
      .select()
      .from(entry)
      .where(and(eq(entry.userId, userId), eq(entry.id, id)));
    if (!row) missing();
    const [people, encounters] = await Promise.all([
      db
        .select({ id: entryPerson.personId })
        .from(entryPerson)
        .innerJoin(person, eq(person.id, entryPerson.personId))
        .where(and(eq(entryPerson.entryId, id), eq(person.userId, userId))),
      db
        .select({ id: entryEncounter.encounterId })
        .from(entryEncounter)
        .innerJoin(encounter, eq(encounter.id, entryEncounter.encounterId))
        .where(
          and(eq(entryEncounter.entryId, id), eq(encounter.userId, userId)),
        ),
    ]);
    return {
      ...publicRecord(row),
      personIds: people.map((p) => p.id),
      encounterIds: encounters.map((e) => e.id),
    };
  },
  async importTranscript(userId: string, input: ImportTranscriptInput) {
    const { requestId, fileUrl, personIds, encounterIds, ...fields } = input;
    const hash = fingerprint({
      operation: "importTranscript",
      fileUrl,
      personIds,
      encounterIds,
      ...fields,
    });
    const receipt = (row: typeof entry.$inferSelect) => ({
      id: row.id,
      title: row.title,
      sourceKind: row.sourceKind,
      version: row.version,
      characterCount: row.originalBody.length,
    });
    const [existing] = await db
      .select()
      .from(entry)
      .where(and(eq(entry.userId, userId), eq(entry.requestId, requestId)));
    const previous = replay(existing, hash);
    if (previous) return receipt(previous);
    // Fetch outside the owner lock. Recheck the request key inside the transaction.
    const body = await readTranscriptFile(fileUrl);
    return write(userId, async (tx) => {
      const [concurrent] = await tx
        .select()
        .from(entry)
        .where(and(eq(entry.userId, userId), eq(entry.requestId, requestId)));
      const previous = replay(concurrent, hash);
      if (previous) return receipt(previous);
      const id = createId("lent");
      const [row] = await tx
        .insert(entry)
        .values({
          ...fields,
          id,
          userId,
          body,
          originalBody: body,
          sourceKind: "transcript",
          requestId,
          requestHash: hash,
        })
        .returning();
      await replaceLinks(tx, userId, id, { personIds, encounterIds });
      return receipt(row!);
    });
  },
  createEntry(
    userId: string,
    input: EntryFields & {
      requestId: string;
      personIds?: string[];
      encounterIds?: string[];
    },
  ) {
    return write(userId, async (tx) => {
      const { requestId, personIds, encounterIds, ...fields } = input;
      const hash = fingerprint({ ...fields, personIds, encounterIds });
      const [existing] = await tx
        .select()
        .from(entry)
        .where(and(eq(entry.userId, userId), eq(entry.requestId, requestId)));
      const previous = replay(existing, hash);
      if (previous) return publicRecord(previous);
      const id = createId("lent");
      const [row] = await tx
        .insert(entry)
        .values({
          ...fields,
          id,
          userId,
          originalBody: fields.body,
          requestId,
          requestHash: hash,
        })
        .returning();
      await replaceLinks(tx, userId, id, { personIds, encounterIds });
      return publicRecord(row!);
    });
  },
  updateEntry(
    userId: string,
    input: {
      id: string;
      version: number;
      changes: Partial<EntryFields> & {
        personIds?: string[];
        encounterIds?: string[];
      };
    },
  ) {
    return write(userId, async (tx) => {
      const current = await ownedEntry(tx, userId, input.id);
      assertVersion(current, input.version);
      const { personIds, encounterIds, ...fields } = input.changes;
      await replaceLinks(tx, userId, input.id, { personIds, encounterIds });
      const [row] = await tx
        .update(entry)
        .set({ ...fields, version: current.version + 1, updatedAt: new Date() })
        .where(and(eq(entry.userId, userId), eq(entry.id, input.id)))
        .returning();
      return publicRecord(row!);
    });
  },
  deleteEntry(userId: string, input: { id: string; version: number }) {
    return write(userId, async (tx) => {
      assertVersion(await ownedEntry(tx, userId, input.id), input.version);
      await tx
        .delete(entry)
        .where(and(eq(entry.userId, userId), eq(entry.id, input.id)));
      return { success: true };
    });
  },
};

export async function transferLoveStoriesInTx(
  tx: TransactionClient,
  fromUserId: string,
  toUserId: string,
) {
  await lockLoveStoriesOwners(tx, [fromUserId, toUserId]);
  const [sourceProfile] = await tx
    .select()
    .from(selfProfile)
    .where(eq(selfProfile.userId, fromUserId));
  if (sourceProfile) {
    const [targetProfile] = await tx
      .select()
      .from(selfProfile)
      .where(eq(selfProfile.userId, toUserId));
    if (!targetProfile) {
      await tx
        .update(selfProfile)
        .set({
          userId: toUserId,
          version: sourceProfile.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(selfProfile.userId, fromUserId));
    } else {
      // Preserve the complete previous profile before filling only missing target values.
      const original = JSON.stringify(
        profileFields.parse(
          Object.fromEntries(
            Object.keys(profileFields.shape).map((key) => [
              key,
              sourceProfile[key as keyof ProfileFields],
            ]),
          ),
        ),
        null,
        2,
      );
      await preserveNotes(
        tx,
        toUserId,
        "Profile preserved during account transfer",
        original,
      );
      const merged = Object.fromEntries(
        Object.keys(profileFields.shape).map((key) => {
          const field = key as keyof ProfileFields;
          const value = targetProfile[field];
          return [
            key,
            value == null ||
            value === "" ||
            (Array.isArray(value) && !value.length)
              ? sourceProfile[field]
              : value,
          ];
        }),
      );
      preserveProfileAttribution(merged, targetProfile, sourceProfile);
      // A country and its city/place details must describe the same location.
      const locationGroups = [
        [
          "originCountryCode",
          "originSubdivisionCode",
          "originCity",
          "originPlaceId",
          "originLabel",
          "additionalOriginCountryCodes",
        ],
        [
          "currentResidenceCountryCode",
          "currentResidenceSubdivisionCode",
          "currentResidenceCity",
          "currentResidencePlaceId",
          "currentResidenceLabel",
        ],
      ] as const;
      for (const keys of locationGroups) {
        const winner = keys.some((key) => {
          const value = targetProfile[key];
          return Array.isArray(value)
            ? value.length > 0
            : value != null && value !== "";
        })
          ? targetProfile
          : sourceProfile;
        for (const key of keys) merged[key] = winner[key];
      }
      merged.additionalOriginCountryCodes =
        (merged.additionalOriginCountryCodes as string[] | null)?.filter(
          (code) => code !== merged.originCountryCode,
        ) ?? null;
      const fields = profileFields.parse(merged);
      validateProfile(fields);
      await tx
        .update(selfProfile)
        .set({
          ...fields,
          version: targetProfile.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(selfProfile.userId, toUserId));
      await tx.delete(selfProfile).where(eq(selfProfile.userId, fromUserId));
    }
  }
  // Children follow the composite Person owner foreign key. Entry links use
  // stable IDs and remain intact throughout the same account-transfer transaction.
  await tx
    .update(person)
    .set({ userId: toUserId })
    .where(eq(person.userId, fromUserId));
  await tx
    .update(entry)
    .set({ userId: toUserId })
    .where(eq(entry.userId, fromUserId));
}
