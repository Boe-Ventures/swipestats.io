# Hinge upload ownership

## Investigation

The upload conflict reported by a customer is reproducible against `main` at
`2452cf8` using synthetic exports and mocked storage. No customer account or
production database was inspected, so this establishes possible causes rather
than the cause of that specific report.

The browser derives a v2 export ID solely from `User.account.signup_time`.
`getUploadContext` previously looked up that ID globally and returned
`needs_signin` or `owned_by_other` when another session owned it. The submit
button then disabled uploading. Direct mutations also rejected another owner.

Uploading the same export from a fresh browser therefore reliably hits this
conflict if the old guest still owns the v2 profile. Better Auth's
`onLinkAccount` transfers only the authenticated guest session's resources.
Signing up elsewhere cannot recover that earlier guest's data. Two different
people whose exports contain the same signup timestamp also have the same v2
ID. This is a collision in the inputs, not a SHA-256 collision.

A matching timestamp cannot prove ownership. Automatically transferring a
profile, including an anonymous profile, would risk crossing account boundaries.
The export omits a durable provider account ID, and age is not a reliable exact
identity discriminator either.

## Proposed behavior

New profiles use a server-derived v3 ID scoped to the authenticated SwipeStats
user and parsed Hinge signup instant. The session may be registered or anonymous.
The browser's v2 ID remains a transport integrity check: the server verifies it
against the uploaded JSON before choosing a destination. It is no longer a
global lookup key for selecting an upload's owner.

For repeat uploads, the server loads only the current user's profile. A
registered owner retains additive updates and chronological account merges.
A returning guest must choose between creating an account to retain history,
or explicitly replacing the imported data in the profile their session owns.
Replacement accepts older or newer exports and does not merge earlier activity.
It retains the guest login, purchases, and user-authored data. Missing optional
photos/prompts or previous CSV activity are cleared on replacement, and current
photo/work consent is enforced again on the server.

All current and legacy mutation names enforce the guest choice. The confirmation
names the currently owned profile; it cannot select somebody else's profile.
The replacement transaction checks ownership and anonymous status again, locks
the upload lease, replaces the imported rows, and commits its result ID before
cleanup. A retry of an already committed upload does not replace twice. A stale
client receives a refreshable choice instead of silently merging or replacing.
Account conversion can complete in the upload screen without discarding the
selected export. Existing public IDs are preserved during ordinary updates and
conversion; historical re-keying is a separate operator action below.

The old `create` and `update` RPC names delegate to the current procedures, so
legacy clients cannot follow a different ownership policy. Admin reprocessing
accepts both historical IDs and scoped IDs, but verifies the stored signup and
owner before processing an existing row.

Public profile IDs remain 64 hexadecimal characters. A nullable `archive_consent`
column is added by the normal generated schema migration. Historical re-keying
remains an explicit operator command, not a deployment-time data migration.

## Retained Hinge source snapshots

Every accepted create, additive update, cross-account merge and guest replacement
now keeps one combined Hinge JSON object in Blob. The source is the existing
strictly validated, anonymized upload payload, with photo/work consent applied.
It includes the supported account, match/message, prompt, media and normalized
CSV evidence supplied in that upload. It is not an untouched original ZIP and
does not preserve unknown sidecars or fields removed by the browser extractor.

The existing owner/session-bound upload object is promoted to an archive by
writing its URL to `original_anonymized_file` in the same transaction as the
profile mutation. Its random per-upload UUID namespace is the revision key;
reuploads never write a shared per-profile latest-object key. Ownership lives
in database rows, not the timestamp-derived path. Guest conversion transfers
those rows without renaming the objects. Committed retries do not add an extra
archive row, and maintenance replay reuses the existing row.

Guest replacement deletes the old derived rows, not earlier source snapshots.
A narrower replacement therefore does not erase the older retained activity.
The new source reference must be recorded before replacement can commit. An
uncommitted upload remains bound to its lease for retry or normal expiry cleanup.
No second, untracked object is created. Cleanup preserves a committed upload
referenced by a matching-provider archive row. Its ledger remains `COMMITTED`,
not incorrectly marked deleted. Account/profile deletion still enumerates and
removes retained source URLs before removing their database pointers.

Privacy redaction is the exception to snapshot immutability. Server processing
checks optional-data consent again, and overwrites only a HEAD-verified exact
object pathname if the browser did not already remove denied fields. Withdrawal
also removes those categories from earlier owned Hinge sources, retaining their
activity. Monotonic redaction flags prevent alternating withdrawals from
restoring previously removed categories. If storage cannot complete a redaction,
the import fails with the old database state and source pointers intact so it
can be retried. Successful Blob redactions are not undone by a later database
rollback; optional data may be removed conservatively on a failed import.
Historical redaction is serial and holds the mutation locks. Owners with many
large sources may hit a request or transaction timeout; that import must not be
reported as accepted. Retry only after investigating the storage failure or
latency, retaining the source pointers and existing derived activity.

`archive_consent` stores the current replay permissions, withdrawal history and
latest accepted source ID. Acceptance order is not inferred from timestamps.
Maintenance reads this policy after acquiring the mutation locks and re-reads
its owned source, so a pre-lock parsed payload cannot restore withdrawn photos
or work data. A new upload can explicitly grant consent again. Older revisions
remain subject to prior withdrawal; the latest accepted source can reflect the
new grant. Legacy rows with no recorded policy do not restore optional fields
on maintenance replay until a new consented upload records that policy.

The existing Blob store is public. This change does not provision private
storage or broaden the accepted payload. New Hinge upload tokens use a short
cache lifetime, but previously cached public bytes cannot be promised immediate
revocation. Private archives require the separate reviewed storage rollout.

The existing cleanup queue selection can be starved by older retained Tinder
rows. This PR deliberately does not drain or reorder that historical backlog:
remaining transport objects need a preservation/recovery decision first. The
per-upload archive guard protects all newly accepted Hinge sources immediately.

Rollback must retain this matching-provider archive guard in both per-upload
and scheduled cleanup. Older code protects Tinder only and can delete retained
Hinge objects whose leases remain `COMMITTED`. If rolling back to that code,
suspend transient cleanup before the rollback and keep it suspended until the
archive guard is restored. Do not run an old cleanup CLI against these rows.
The additive nullable schema column can remain in place during a code rollback.

These changes retain future inputs; they do not recover already-deleted exports
or verify historical object availability. Admin replay still operates on one
selected owned source. Rebuilding an additive/cross-account history requires an
ordered multi-source replay with replacement boundaries, not blindly replacing
a combined profile with its newest upload. Keep database backups for manual
annotations, purchases, merge/replacement history and other non-export state.

## Recovery limits

A fresh import uses only the files supplied in that session. It does not recover
older exports, purchases, subscriptions, or annotations from another account.
The upload page explains this and suggests signing in from the original guest
browser before creating a separate copy. Support should verify account access
before any recovery; a matching signup timestamp alone is insufficient.

Separate imports can represent the same person in multiple SwipeStats accounts.
They remain separate profile/cohort records. This change does not attempt global
person deduplication or merge billing entitlements. Within one SwipeStats
account, exact signup equality remains the existing same-Hinge-account
assumption. A trustworthy provider ID or verified recovery mechanism would be
needed to improve these boundaries further.

## Validation

The router regression harness uses real tRPC procedures, blob schema validation,
export-ID verification, and destination resolution with mocked database/storage
operations. It fails against the original router at the blocked `needs_signin`
scenario and passes with the fix. It covers separate owners sharing a timestamp,
legacy and scoped profile updates, transferred guests, committed upload retries,
legacy RPC aliases, forward/backward merges, mismatched exports, and maintenance
validation. It also checks that every returning-guest mutation requires a choice,
that a confirmed older export uses replacement, and that registered accounts
cannot invoke the guest replacement mode.

`bun test:hinge:postgres` creates a disposable local PostgreSQL cluster, applies
all repository migrations, and exercises the real profile services, ownership
checks, lease SQL, and historical re-key operation. Only Blob storage transport is
mocked. The fixture exercises real JSON retrieval, verification and profile
services against an in-memory object store. It verifies retained source replay,
archive protection, consent redaction and storage/transaction failure safety,
as well as replacement rather than addition, photo/work consent, CSV
clearing, rollback after an account changes, preserved guest login/manual data,
all direct profile references, polymorphic references, re-key idempotency, and
rollback after an injected postcondition failure. PostgreSQL binaries must be
on PATH. The runner shuts down and removes only its own temporary cluster.

## Historical ID migration

`bun data-layer:rekey-hinge-profiles --plan /private/path/hinge-rekey.json`
is read-only for the database. It writes a private, exclusive-create JSON plan
(mode 0600) containing old/new IDs, ownership, and signup time. Supply
`HINGE_REKEY_DATABASE_URL` explicitly as the intended direct database connection;
the command does not fall back to the application's DATABASE_URL. The plan is
bound to that endpoint and database, and its contents must stay out of git.

For owned profiles the target is the same v3 owner/signup ID as a new upload.
Ownerless historical rows receive random 256-bit IDs recorded in the plan.
Their ownership remains null. Already matching v3 rows are omitted. Reuse the
same reviewed plan on retries, particularly for ownerless rows.

To apply the reviewed plan:

```sh
bun data-layer:rekey-hinge-profiles --plan /private/path/hinge-rekey.json --apply --retire-old-links
```

This deliberately retires old insights URLs and comparison URLs containing old
IDs. No public aliases or redirects keep the predictable keys working. The
explicit retirement flag makes that deployment choice visible. The PR prepares
this operation; it does not run it against shared dev or production.

Rehearse on an isolated branch of production before production use. Create a
fresh plan for each database endpoint, inspect the counts, retain the plan as an
operator audit artifact, and take a recoverable backup/branch first. Deploy the
new upload routing before re-keying. Use a maintenance window: the transaction
holds the Hinge provider lock and write locks on referenced tables, with lock
and statement timeouts. Ordinary reads remain available.

The transaction snapshots each complete profile, frees its unique owner slot,
copies it under the new ID, moves every catalog-discovered direct foreign key,
and checks row contents and reference counts before removing the empty old row.
It also moves the SwipeRank provider registry, transient-upload result IDs, and
Hinge attachment resource IDs. Missing, changed-owner, changed-signup, duplicate,
wrong-target, and conflicting plans abort. A postcondition failure rolls back
all changes. Reapplying the same plan is a no-op for already migrated rows.

Transport IDs, historical upload paths, and original export evidence are not
public profile IDs and remain unchanged. Dataset-export profile lists are
Tinder-only. AI input snapshots contain no live Hinge ID; their subject foreign
key moves. External bookmarks, exported documents and analytics history are not
rewritten. The migration does not regenerate analytics or delete customer data.

## Browser QA checklist

1. Upload as a guest, then open a separate browser session and upload the same
   files. Both sessions should reach separate insights URLs.
2. Return in the first guest browser. Uploading again must show the choice and
   remain disabled until replacement is checked or account creation completes.
3. Confirm replacement with a narrower export. Only its imported activity should
   remain. The guest session should still work. Try an older signup too.
4. Instead choose account creation. The selected file should remain available,
   the guest choice should disappear, and submission should retain/merge history.
5. A registered account should continue to add data without a guest prompt.
6. Replace the selected export after checking replacement; the checkbox should
   reset, including when the new export has the same signup timestamp.

Browser QA and a production account-specific diagnosis remain separate from the
automated results. No production or shared-dev data has been re-keyed by this PR.
