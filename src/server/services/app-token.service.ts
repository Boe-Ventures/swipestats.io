import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";

import { db, withTransaction } from "@/server/db";
import {
  appTokenTable,
  type AppToken,
  type AppTokenPurpose,
} from "@/server/db/schema";

export function normalizeAppTokenSubject(subject: string) {
  return subject.trim().toLowerCase();
}

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createAppToken(input: {
  purpose: AppTokenPurpose;
  subject: string;
  expiresInSeconds: number;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}) {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);

  const [row] = await db
    .insert(appTokenTable)
    .values({
      purpose: input.purpose,
      subject: normalizeAppTokenSubject(input.subject),
      tokenHash: hashToken(rawToken),
      expiresAt,
      metadata: input.metadata ?? {},
      createdBy: input.createdBy ?? null,
    })
    .returning();

  return { rawToken, token: row };
}

export async function countRecentAppTokens(input: {
  purpose: AppTokenPurpose;
  subject: string;
  since: Date;
}) {
  const [row] = await db
    .select({ count: count() })
    .from(appTokenTable)
    .where(
      and(
        eq(appTokenTable.purpose, input.purpose),
        eq(appTokenTable.subject, normalizeAppTokenSubject(input.subject)),
        gte(appTokenTable.createdAt, input.since),
      ),
    );

  return row?.count ?? 0;
}

export async function validateAppToken(input: {
  token: string;
  purpose: AppTokenPurpose;
  allowUsed?: boolean;
}): Promise<AppToken | null> {
  const row = await db.query.appTokenTable.findFirst({
    where: eq(appTokenTable.tokenHash, hashToken(input.token)),
  });

  if (!row) return null;
  if (row.purpose !== input.purpose) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  if (!input.allowUsed && row.usedAt) return null;

  return row;
}

export async function consumeAppToken(input: {
  token: string;
  purpose: AppTokenPurpose;
}): Promise<AppToken | null> {
  const tokenHash = hashToken(input.token);

  return withTransaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(appTokenTable)
      .where(
        and(
          eq(appTokenTable.tokenHash, tokenHash),
          eq(appTokenTable.purpose, input.purpose),
          isNull(appTokenTable.usedAt),
        ),
      )
      .limit(1);

    if (!row || row.expiresAt.getTime() <= Date.now()) return null;

    const [updated] = await tx
      .update(appTokenTable)
      .set({ usedAt: new Date() })
      .where(
        and(eq(appTokenTable.id, row.id), isNull(appTokenTable.usedAt)),
      )
      .returning();

    return updated ?? null;
  });
}

export async function deleteExpiredAppTokens(now = new Date()) {
  await db.delete(appTokenTable).where(lt(appTokenTable.expiresAt, now));
}
