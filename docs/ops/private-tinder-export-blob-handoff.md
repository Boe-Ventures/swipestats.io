# Private Tinder export Blob handoff

## Current state

Tinder exports are anonymized in the browser, uploaded to the existing public
Vercel Blob store, then processed on the server. The accepted public Blob URL
is retained in `original_anonymized_file`; raw JSON is not stored in Postgres.

The transient upload remains marked `COMMITTED`. Its cleanup worker checks for
the matching Tinder `original_anonymized_file` pointer and keeps that archived
Blob instead of deleting it.

## Why this is deferred

Private Blob storage is the right destination for sensitive export history, but
it needs a separate rollout. The recovery work for uploads deleted by the
transient pipeline should stay independent from a storage migration.

## Known legacy inventory

Production inspection on 2026-08-11 found:

- 12,726 distinct `original_anonymized_file.blob_url` values in the public
  store, across 11,365 users.
- No raw original JSON bodies in Postgres.
- 121 committed Tinder transient uploads between 2026-08-04 and 2026-08-11.
  Their source objects were marked for cleanup. Recovery will rebuild a
  clearly-labelled derived-state export where no permanent archive exists.

## Future private-store design

1. Create a dedicated private Tinder export Blob store.
2. Run deployed Vercel code with OIDC for archive writes, reads, and migration
   jobs. Local emergency work uses a dedicated store token supplied only for
   that command.
3. Add an immutable revision record with private pathname, checksum, length,
   acceptance time, and source Tinder account identity.
4. Copy legacy public objects to the private store, verify every copied object,
   and retain a migration audit trail.
5. Remove public originals only after explicit approval and a completed audit.

Private exports must be delivered through an authorized application endpoint.
OIDC authenticates the Vercel runtime to storage; it does not authorize an end
user to read another user's export.

## Purchased research datasets in the broader rollout

Status: plan only. PR #67 keeps research files in the existing public store and streams authorized downloads through the app. It does not configure private storage or include an executable migration. Coordinate archive and purchased-dataset storage in one rollout; public demo assets can remain public.

### Inventory and configuration

- Refresh the historical inventory above before execution. Map archive revisions, legacy original-file pointers, transient uploads and `dataset_export.blob_url` references to their stores and lifecycle owners. Record missing objects and shared references before changing pointers.
- Upgrade and pin a Blob SDK with private reads and Vercel OIDC support in the implementation PR. Verify compatibility with all existing upload, deletion and listing callers.
- Provision private storage with separate preview and production access. Prefer the existing OIDC design for Vercel workloads. Use explicit store identifiers for routing when more than one store is attached; choose the final configuration names during implementation instead of adding dormant environment variables now.
- Local migration tooling receives a scoped credential explicitly. Keep tokens and full object URLs out of application logs and committed manifests. Decide whether archive and research lifecycles need separate private stores before provisioning.

### Application changes before copying

Deploy a reader that supports both legacy public objects and authenticated private reads. Route archive downloads through owner/admin authorization; purchased datasets use license validation. A shared store never substitutes for these separate access rules.

For research downloads, the browser posts its license to the app. The server validates entitlement, reserves a download atomically, opens the private object using its runtime credentials and streams the bytes with `private, no-store`. Keep storage credentials and underlying URLs server-side. Preserve JSON and gzip content types and filenames, and account for hosted function duration, streaming limits and bandwidth cost using the largest intended dataset.

Switch new writes only after this reader is deployed and tested. Private upload failures must surface as failures. Keep the browser acknowledgement limited to download initiation; transfer completion belongs to the browser.

### Migration and recovery

Build a dry-run-first, resumable command with an explicit private manifest output path. For each referenced object, stream its original bytes to private storage, read the copy back and compare full SHA-256 and byte length. Preserve format, cohort, profile IDs, messages, purchase terms and download counts. Do not regenerate a purchased dataset from today's database.

Record the verified copy before conditionally updating the owning database pointer, checking that the source pointer has not changed. Group shared references so an object cannot be retired while another live reference still needs it. Record each phase so interruptions can resume without copying or switching completed work again. Test recovery from upload failure, hash mismatch, manifest-write failure and a concurrent pointer change.

Keep public originals until authorized retirement after successful delivery checks. Retire in a separate operation and verify CDN availability has ceased. Before deletion, rollback can restore recorded source pointers; afterwards, recovery must use the verified private copy. Storage rollback must preserve the intended access restrictions.

### Acceptance tests

- Unit and fixture coverage: public/private routing, correct store credentials, no public fallback, authorization, JSON/gzip headers, exact byte preservation, idempotent resume, pointer races and shared-object handling.
- Real preview store: upload and read representative small and large files, confirm anonymous private-object access fails, and verify owner/license-authorized streaming succeeds. Check rejected and expired entitlements without consuming a download.
- Browser: repeat successful downloads, delay response headers and body, exercise error/retry, change license during refresh, and unmount during initiation and after browser handoff. Verify complete saved-file size/hash and bounded frame/timer cleanup.
- Production: perform an authorized small pilot, verify archive retrieval and paid delivery, then migrate in bounded batches with counts and checksums reconciled. Source retirement follows its own approval.

[Vercel Blob security](https://vercel.com/docs/vercel-blob/security) describes private reads and OIDC authentication. Recheck the SDK and provider configuration at implementation time.
