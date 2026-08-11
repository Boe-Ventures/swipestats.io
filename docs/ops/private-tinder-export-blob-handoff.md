# Private Tinder export Blob handoff

## Current state

Tinder exports are anonymized in the browser, uploaded to the existing public
Vercel Blob store, then processed on the server. The accepted public Blob URL
is retained in `original_anonymized_file`; raw JSON is not stored in Postgres.

The temporary-upload ledger has a `RETAINED` state for Tinder exports. It
prevents the transient cleanup worker from deleting a Blob once the matching
profile transaction and original-file pointer have committed.

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
