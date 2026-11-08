import { and, eq } from "drizzle-orm";
import { head, put } from "@vercel/blob";

import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import { parseAnonymizedHingeBlob } from "@/lib/upload/hinge-runtime-schema";
import { isBlobPathForTransientLease } from "@/lib/upload/transient-upload";
import { filterHingeJsonByConsent } from "@/lib/utils/filterHingePayload";
import type { TransactionClient } from "@/server/db";
import {
  hingeProfileTable,
  originalAnonymizedFileTable,
  transientUploadTable,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { fetchBlobJson } from "@/server/services/blob.service";
import type { TransientUploadBinding } from "@/server/services/transient-upload.service";

/**
 * Replace only a known object's contents, never allocate an untracked copy.
 * Privacy redaction is the only permitted change to an accepted snapshot.
 * The existing pointer remains usable if a provider write or DB commit fails.
 */
async function redactBlob(
  blobUrl: string,
  before: AnonymizedHingeDataJSON,
  after: AnonymizedHingeDataJSON,
  expectedPathname?: string,
) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  const metadata = await head(blobUrl);
  if (
    metadata.url !== blobUrl ||
    (expectedPathname &&
      !isBlobPathForTransientLease(expectedPathname, metadata.pathname))
  ) {
    throw new Error("Hinge archive object does not match its upload.");
  }
  const result = await put(metadata.pathname, JSON.stringify(after), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  if (result.url !== blobUrl) {
    throw new Error("Hinge archive redaction changed the object URL.");
  }
}

/**
 * Promote the owner-bound upload itself to an archive in the profile transaction.
 * Its UUID namespace is a revision, not a mutable per-profile latest.json key.
 * The archive pointer and accepted profile commit together; a failed import
 * remains a tracked temporary upload and may be retried or expired normally.
 * Call only after acquiring the lease, provider and profile locks and checking
 * current ownership. Never call the cleanup worker before this transaction ends.
 */
export async function archiveHingeUploadInTx(
  tx: TransactionClient,
  input: {
    userId: string;
    blobUrl: string;
    verifiedJson: AnonymizedHingeDataJSON;
    consentPhotos?: boolean;
    consentWork?: boolean;
    transientUpload?: TransientUploadBinding;
  },
) {
  const ownedProfile = await tx.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.userId, input.userId),
    columns: { archiveConsent: true },
  });
  const previousPolicy = ownedProfile?.archiveConsent;
  const consent = input.transientUpload
    ? {
        sharePhotos: input.consentPhotos ?? true,
        shareWorkInfo: input.consentWork ?? true,
      }
    : {
        // Maintenance is not a new grant of consent. The policy is read after the
        // mutation locks, not from the earlier admin request or cached source.
        sharePhotos: previousPolicy?.sharePhotos ?? false,
        shareWorkInfo: previousPolicy?.shareWorkInfo ?? false,
      };
  const consentPolicy = {
    ...consent,
    redactPhotos:
      (previousPolicy?.redactPhotos ?? false) || !consent.sharePhotos,
    redactWorkInfo:
      (previousPolicy?.redactWorkInfo ?? false) || !consent.shareWorkInfo,
  };
  const files = await tx.query.originalAnonymizedFileTable.findMany({
    where: and(
      eq(originalAnonymizedFileTable.userId, input.userId),
      eq(originalAnonymizedFileTable.dataProvider, "HINGE"),
    ),
    columns: { id: true, blobUrl: true, file: true },
    orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
  });

  const existingSource = files.find((file) => file.blobUrl === input.blobUrl);
  const sourceId = existingSource?.id ?? createId("oaf");
  const policy = {
    ...consentPolicy,
    latestSourceId: input.transientUpload
      ? sourceId
      : (previousPolicy?.latestSourceId ?? null),
  };

  let expectedPathname: string | undefined;
  if (input.transientUpload) {
    const binding = input.transientUpload;
    const lease = await tx.query.transientUploadTable.findFirst({
      where: eq(transientUploadTable.id, binding.id),
    });
    if (
      lease?.status !== "PROCESSING" ||
      lease.dataProvider !== "HINGE" ||
      lease.userId !== input.userId ||
      lease.sessionId !== binding.sessionId ||
      lease.profileId !== binding.profileId ||
      lease.blobUrl !== input.blobUrl
    ) {
      throw new Error("Hinge archive requires the locked owner-bound upload.");
    }
    expectedPathname = lease.expectedPathname;
  } else if (!existingSource) {
    // Maintenance may replay retained history, but a timestamp match alone
    // must not attach another owner's public source to this account.
    throw new Error(
      "Hinge replay requires a retained source owned by this user.",
    );
  }

  // Re-read retained sources under the mutation locks. Older revisions cannot
  // regain previously withdrawn fields merely because a newer upload opted in.
  // Persist identity instead of inferring acceptance order from timestamps or
  // random IDs. Ties and clock adjustments must not revive older private bytes.
  const isLatestSource = existingSource?.id === policy.latestSourceId;
  const replayConsent = input.transientUpload
    ? consent
    : {
        sharePhotos:
          consent.sharePhotos && (isLatestSource || !policy.redactPhotos),
        shareWorkInfo:
          consent.shareWorkInfo && (isLatestSource || !policy.redactWorkInfo),
      };
  const source = parseAnonymizedHingeBlob(
    input.transientUpload
      ? input.verifiedJson
      : await fetchBlobJson(input.blobUrl),
  );
  const filtered = parseAnonymizedHingeBlob(
    filterHingeJsonByConsent(source, replayConsent),
  );

  // The browser normally already applied consent. Enforce it again before
  // promoting the source, including callers that bypassed the browser filter.
  await redactBlob(input.blobUrl, source, filtered, expectedPathname);

  if (!consent.sharePhotos || !consent.shareWorkInfo) {
    // Retain historical activity, but do not retain or later resurrect optional
    // fields that this owner withdrew. Redactions intentionally survive a later
    // DB rollback. A failed redaction leaves every pointer intact for retry.
    for (const url of new Set(files.map((file) => file.blobUrl))) {
      if (!url || url === input.blobUrl) continue;
      const previous = parseAnonymizedHingeBlob(await fetchBlobJson(url));
      const redacted = parseAnonymizedHingeBlob(
        filterHingeJsonByConsent(previous, {
          sharePhotos: !policy.redactPhotos,
          shareWorkInfo: !policy.redactWorkInfo,
        }),
      );
      await redactBlob(url, previous, redacted);
    }
    for (const file of files) {
      if (file.file === null) continue;
      const previous = parseAnonymizedHingeBlob(file.file);
      await tx
        .update(originalAnonymizedFileTable)
        .set({
          file: filterHingeJsonByConsent(previous, {
            sharePhotos: !policy.redactPhotos,
            shareWorkInfo: !policy.redactWorkInfo,
          }),
          updatedAt: new Date(),
        })
        .where(eq(originalAnonymizedFileTable.id, file.id));
    }
  }

  // A retry after a committed response loss returns through the upload ledger
  // before reaching here. Maintenance replay reuses its existing source row.
  if (!existingSource) {
    await tx.insert(originalAnonymizedFileTable).values({
      id: sourceId,
      dataProvider: "HINGE",
      swipestatsVersion: "SWIPESTATS_4",
      file: null,
      blobUrl: input.blobUrl,
      userId: input.userId,
    });
  }
  return { json: filtered, policy };
}
