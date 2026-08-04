import { and, eq, gt, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { del, head, list } from "@vercel/blob";

import { CLIENT_UPLOAD_LIMITS } from "@/lib/blob-client-upload-policy";
import {
  isBlobPathForTransientLease,
  transientUploadCleanupPrefix,
} from "@/lib/upload/transient-upload";
import { isTrustedVercelBlobUrl } from "@/server/services/blob.service";
import { db, type TransactionClient } from "@/server/db";
import { transientUploadTable, type TransientUpload } from "@/server/db/schema";

export type TransientDataProvider = "TINDER" | "HINGE";

export interface TransientUploadBinding {
  id: string;
  userId: string;
  sessionId: string;
  dataProvider: TransientDataProvider;
  profileId: string;
  blobUrl: string;
}

export const TRANSIENT_UPLOAD_LEASE_MS = 24 * 60 * 60 * 1000;

// REVIEW(storage constraint): @vercel/blob 0.27 client uploads only support
// `access: "public"`. This lease narrows the public exposure window and makes
// cleanup accountable, but it is not equivalent to private object storage.

function providerPathPrefix(provider: TransientDataProvider): string {
  return provider === "TINDER" ? "tinder-data" : "hinge-data";
}

function assertLeaseIdentity(
  lease: TransientUpload,
  binding: Omit<TransientUploadBinding, "blobUrl"> & { blobUrl?: string },
): void {
  if (
    lease.userId !== binding.userId ||
    lease.sessionId !== binding.sessionId ||
    lease.dataProvider !== binding.dataProvider ||
    lease.profileId !== binding.profileId ||
    (binding.blobUrl && lease.blobUrl && lease.blobUrl !== binding.blobUrl)
  ) {
    throw new Error("Temporary upload does not belong to this session.");
  }
}

export async function issueTransientUploadLease(input: {
  id: string;
  userId: string;
  sessionId: string;
  dataProvider: TransientDataProvider;
  profileId: string;
  expectedPathname: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const expectedPrefix = `${providerPathPrefix(input.dataProvider)}/${input.profileId}/${input.id}/`;
  if (
    !input.expectedPathname.startsWith(expectedPrefix) ||
    input.expectedPathname !== `${expectedPrefix}data.json`
  ) {
    throw new Error("Temporary upload pathname does not match its lease.");
  }

  await db
    .insert(transientUploadTable)
    .values({
      id: input.id,
      userId: input.userId,
      sessionId: input.sessionId,
      dataProvider: input.dataProvider,
      profileId: input.profileId,
      expectedPathname: input.expectedPathname,
      expiresAt: new Date(now.getTime() + TRANSIENT_UPLOAD_LEASE_MS),
    })
    .onConflictDoNothing({ target: transientUploadTable.id });

  const lease = await db.query.transientUploadTable.findFirst({
    where: eq(transientUploadTable.id, input.id),
  });
  if (!lease) throw new Error("Temporary upload lease could not be created.");
  assertLeaseIdentity(lease, input);
  if (
    lease.expectedPathname !== input.expectedPathname ||
    lease.expiresAt <= now ||
    !["ISSUED", "UPLOADED"].includes(lease.status)
  ) {
    throw new Error("Temporary upload lease cannot be reused.");
  }
}

async function bindTransientUpload(input: {
  id: string;
  blobUrl: string;
  blobPathname: string;
  uploadedAt: Date;
}): Promise<void> {
  const existing = await db.query.transientUploadTable.findFirst({
    where: eq(transientUploadTable.id, input.id),
  });
  if (!existing) throw new Error("Temporary upload lease was not found.");
  if (existing.expiresAt <= new Date()) {
    throw new Error("Temporary upload lease has expired.");
  }
  if (!isTrustedVercelBlobUrl(input.blobUrl)) {
    throw new Error("Temporary upload URL is not trusted.");
  }
  if (
    !isBlobPathForTransientLease(existing.expectedPathname, input.blobPathname)
  ) {
    throw new Error("Temporary upload URL does not match its lease.");
  }
  if (existing.blobUrl && existing.blobUrl !== input.blobUrl) {
    throw new Error("Temporary upload lease is already bound.");
  }
  if (["PROCESSING", "COMMITTED", "CLEANED"].includes(existing.status)) {
    if (existing.blobUrl === input.blobUrl) return;
    throw new Error("Temporary upload lease cannot be rebound.");
  }

  const [bound] = await db
    .update(transientUploadTable)
    .set({
      blobUrl: input.blobUrl,
      blobPathname: input.blobPathname,
      uploadedAt: input.uploadedAt,
      status: "UPLOADED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transientUploadTable.id, input.id),
        inArray(transientUploadTable.status, ["ISSUED", "UPLOADED"]),
        or(
          isNull(transientUploadTable.blobUrl),
          eq(transientUploadTable.blobUrl, input.blobUrl),
        ),
      ),
    )
    .returning({ id: transientUploadTable.id });
  if (!bound) {
    throw new Error("Temporary upload lease was bound concurrently.");
  }
}

/** Authoritative Vercel callback binding; safe to call again after registration. */
export async function bindTransientUploadFromCallback(input: {
  id: string;
  blobUrl: string;
  blobPathname: string;
}): Promise<void> {
  await bindTransientUpload({ ...input, uploadedAt: new Date() });
}

/**
 * Explicit authenticated registration used by processing routes. This removes
 * any dependency on callback ordering (and works locally, where Vercel does not
 * deliver onUploadCompleted) while HEAD proves the URL belongs to our Blob
 * store, lease namespace, MIME/size policy, and issuance window.
 */
export async function registerTransientUploadForProcessing(
  binding: TransientUploadBinding,
  now = new Date(),
): Promise<TransientUpload> {
  const lease = await db.query.transientUploadTable.findFirst({
    where: eq(transientUploadTable.id, binding.id),
  });
  if (!lease) throw new Error("Temporary upload lease was not found.");
  assertLeaseIdentity(lease, binding);

  if (["COMMITTED", "CLEANED"].includes(lease.status)) return lease;
  if (lease.expiresAt <= now) {
    throw new Error("Temporary upload lease has expired.");
  }

  if (!lease.blobUrl) {
    if (!isTrustedVercelBlobUrl(binding.blobUrl)) {
      throw new Error("Temporary upload URL is not trusted.");
    }
    const metadata = await head(binding.blobUrl);
    if (
      metadata.url !== binding.blobUrl ||
      !isBlobPathForTransientLease(lease.expectedPathname, metadata.pathname) ||
      !metadata.contentType.toLowerCase().startsWith("application/json") ||
      metadata.size > CLIENT_UPLOAD_LIMITS.dataExportBytes ||
      metadata.uploadedAt < new Date(lease.createdAt.getTime() - 60_000) ||
      metadata.uploadedAt > new Date(now.getTime() + 60_000)
    ) {
      throw new Error("Temporary upload metadata does not match its lease.");
    }
    await bindTransientUpload({
      id: binding.id,
      blobUrl: binding.blobUrl,
      blobPathname: metadata.pathname,
      uploadedAt: metadata.uploadedAt,
    });
  }

  const registered = await db.query.transientUploadTable.findFirst({
    where: eq(transientUploadTable.id, binding.id),
  });
  if (!registered) throw new Error("Temporary upload lease was not found.");
  assertLeaseIdentity(registered, binding);
  if (["COMMITTED", "CLEANED"].includes(registered.status)) {
    return registered;
  }
  if (registered.status !== "UPLOADED") {
    throw new Error("Temporary upload is not ready for processing.");
  }
  return registered;
}

/** First statement in the provider transaction: lock the exact upload lease. */
export async function lockTransientUploadForMutationInTx(
  tx: TransactionClient,
  binding: TransientUploadBinding | undefined,
): Promise<void> {
  if (!binding) return;
  const [lease] = await tx
    .update(transientUploadTable)
    .set({ status: "PROCESSING", processingStartedAt: new Date() })
    .where(
      and(
        eq(transientUploadTable.id, binding.id),
        eq(transientUploadTable.userId, binding.userId),
        eq(transientUploadTable.sessionId, binding.sessionId),
        eq(transientUploadTable.dataProvider, binding.dataProvider),
        eq(transientUploadTable.profileId, binding.profileId),
        eq(transientUploadTable.blobUrl, binding.blobUrl),
        eq(transientUploadTable.status, "UPLOADED"),
        gt(transientUploadTable.expiresAt, new Date()),
      ),
    )
    .returning({ id: transientUploadTable.id });
  if (!lease) {
    throw new Error("Temporary upload is not available for this mutation.");
  }
}

/** Last statement in the provider transaction: durable post-commit cleanup proof. */
export async function markTransientUploadCommittedInTx(
  tx: TransactionClient,
  binding: TransientUploadBinding | undefined,
  resultProfileId: string,
): Promise<void> {
  if (!binding) return;
  const [lease] = await tx
    .update(transientUploadTable)
    .set({
      status: "COMMITTED",
      resultProfileId,
      committedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transientUploadTable.id, binding.id),
        eq(transientUploadTable.status, "PROCESSING"),
      ),
    )
    .returning({ id: transientUploadTable.id });
  if (!lease) throw new Error("Temporary upload commit marker was lost.");
}

async function listTransientLeaseUrls(
  expectedPathname: string,
): Promise<string[]> {
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix: transientUploadCleanupPrefix(expectedPathname),
      ...(cursor ? { cursor } : {}),
    });
    urls.push(...page.blobs.map((blob) => blob.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return urls;
}

async function deleteEveryBlobForLease(lease: TransientUpload): Promise<void> {
  const listedUrls = await listTransientLeaseUrls(lease.expectedPathname);
  const urls = Array.from(
    new Set([...listedUrls, ...(lease.blobUrl ? [lease.blobUrl] : [])]),
  );
  if (urls.length > 0) await del(urls);
}

export interface TransientUploadCleanupSummary {
  scanned: number;
  claimed: number;
  cleaned: number;
  failed: number;
  skippedRace: number;
}

/**
 * Bounded worker used by both cron and the operator CLI. An expired,
 * noncommitted row is first claimed as ABANDONED with an exact-state CAS. A
 * provider transaction that already owns the row therefore wins cleanly, and
 * its COMMITTED marker can never be overwritten by cleanup.
 */
export async function cleanupTransientUploadsBatch(
  options: {
    limit?: number;
    now?: Date;
    uploadId?: string;
  } = {},
): Promise<TransientUploadCleanupSummary> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const now = options.now ?? new Date();
  const candidates = await db.query.transientUploadTable.findMany({
    where: and(
      ...(options.uploadId
        ? [eq(transientUploadTable.id, options.uploadId)]
        : []),
      ne(transientUploadTable.status, "CLEANED"),
      or(
        eq(transientUploadTable.status, "COMMITTED"),
        and(
          lte(transientUploadTable.expiresAt, now),
          or(
            ne(transientUploadTable.status, "ABANDONED"),
            isNull(transientUploadTable.cleanedAt),
          ),
        ),
      ),
    ),
    orderBy: (table, { asc }) => [asc(table.expiresAt)],
    limit,
  });

  const summary: TransientUploadCleanupSummary = {
    scanned: candidates.length,
    claimed: 0,
    cleaned: 0,
    failed: 0,
    skippedRace: 0,
  };

  for (const candidate of candidates) {
    const isCommitted = candidate.status === "COMMITTED";
    let claimed: TransientUpload | undefined;

    if (isCommitted || candidate.status === "ABANDONED") {
      [claimed] = await db
        .update(transientUploadTable)
        .set({
          cleanupAttemptedAt: now,
          cleanupAttempts: sql`${transientUploadTable.cleanupAttempts} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(transientUploadTable.id, candidate.id),
            eq(transientUploadTable.status, candidate.status),
            ...(candidate.status === "ABANDONED"
              ? [isNull(transientUploadTable.cleanedAt)]
              : []),
          ),
        )
        .returning();
    } else {
      [claimed] = await db
        .update(transientUploadTable)
        .set({
          status: "ABANDONED",
          cleanupAttemptedAt: now,
          cleanupAttempts: sql`${transientUploadTable.cleanupAttempts} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(transientUploadTable.id, candidate.id),
            eq(transientUploadTable.status, candidate.status),
            lte(transientUploadTable.expiresAt, now),
          ),
        )
        .returning();
    }

    if (!claimed) {
      summary.skippedRace += 1;
      continue;
    }
    summary.claimed += 1;

    try {
      await deleteEveryBlobForLease(claimed);
      const [finished] = await db
        .update(transientUploadTable)
        .set({
          status: isCommitted ? "CLEANED" : "ABANDONED",
          cleanedAt: now,
          lastCleanupError: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(transientUploadTable.id, candidate.id),
            eq(
              transientUploadTable.status,
              isCommitted ? "COMMITTED" : "ABANDONED",
            ),
          ),
        )
        .returning({ id: transientUploadTable.id });
      if (finished) summary.cleaned += 1;
      else summary.skippedRace += 1;
    } catch (error) {
      summary.failed += 1;
      await db
        .update(transientUploadTable)
        .set({
          lastCleanupError: String(
            error instanceof Error ? error.message : error,
          ).slice(0, 500),
          updatedAt: now,
        })
        .where(
          and(
            eq(transientUploadTable.id, candidate.id),
            eq(
              transientUploadTable.status,
              isCommitted ? "COMMITTED" : "ABANDONED",
            ),
          ),
        );
    }
  }

  return summary;
}

/**
 * Delete only after the provider transaction committed. Cleanup failure is
 * recorded, never allowed to turn a successful profile commit into a failed
 * response, and is retried by the data-layer cleanup command.
 */
export async function cleanupCommittedTransientUpload(
  uploadId: string | undefined,
): Promise<boolean> {
  if (!uploadId) return true;
  try {
    const lease = await db.query.transientUploadTable.findFirst({
      where: eq(transientUploadTable.id, uploadId),
    });
    if (!lease) return false;
    if (lease.status === "CLEANED") return true;
    if (lease.status !== "COMMITTED" || !lease.blobUrl) return false;

    await cleanupTransientUploadsBatch({ limit: 1, uploadId });
    const refreshed = await db.query.transientUploadTable.findFirst({
      where: eq(transientUploadTable.id, uploadId),
    });
    return refreshed?.status === "CLEANED";
  } catch {
    // Never turn a committed provider transaction into a failed upload
    // response. The durable COMMITTED row is retried by the hourly worker.
    return false;
  }
}
