# Tinder upload ownership and guest recovery

## Problem and behavior

The browser's Tinder export fingerprint hashes birth date and provider account
creation date. Those dates are content-consistency fields, not proof that a
SwipeStats user owns an existing profile. Looking up this fingerprint globally
blocked a signed-in user's fresh import when a previous guest session had
uploaded the same export. It also conflated unrelated exports with the same
identity dates.

New Tinder profiles use a server-derived ID scoped to the authenticated
SwipeStats user, the normalized UTC birth calendar date, and provider creation
instant. The legacy fingerprint still binds the uploaded JSON and temporary
upload lease. It is never used to claim another session's profile.

The upload context and all upload mutations resolve only the current owner's
profile. Existing owned profiles keep their ID when both identity dates match,
including equivalent timestamp spellings and profiles transferred by genuine
guest sign-in. Returned links and committed retries use the actual stored ID.
The deprecated create mutation follows the same scoping policy. Admin replay
checks target ownership and verifies content identity separately from the stored
ID.

A user who lost the old guest session can import their export into their signed-in
account without deleting or transferring anything from the inaccessible session.
This is an independent import, **not lost-session recovery**. Old guest archives,
profiles, purchases and artifacts remain with that guest. The new import does not
reconstruct missing exports or recover an old purchase. No customer-specific
account inspection or production repair is part of this change.

Repeat exports retain the current profile ID and previous accepted source files.
As before, the current analytical projection is rebuilt from the submitted
complete export. Older sources are retained, but are not automatically unioned
into that projection. A distinct newer Tinder account may be merged only within
the current SwipeStats owner, with birth-date and chronological checks. Older or
mismatched accounts fail without a deletion workaround.

## Original-session sign-in

Better Auth's original guest session remains the proof used for account
conversion. Conversion keeps provider IDs and moves owned resources in one
transaction. Tinder mutations and conversion coordinate with provider advisory
locks so a concurrent merge cannot leave a replacement row behind for cascade
deletion.

Conversion requires an anonymous source and a registered destination. It never
overwrites destination identity, security or consent fields with guest defaults.
Application history is combined and destination scalar preferences win. A free
guest cannot downgrade a paid destination. Purchases, saved exports, generated
outputs and user-defined cohorts are retained.

These cases fail closed, preserving both accounts for support review:

- Both accounts already hold a profile for the same dating app.
- The source guest has any paid tier, lifetime entitlement, or subscription
  metadata. Provider renewal and refund webhooks still refer to its original
  user ID and need separate billing reconciliation.
- The source holds catalog access that must not be transferred implicitly.

Destination billing is never overwritten. No payment, refund, external billing
reconciliation or account recovery is performed by this PR. A separate legacy
admin merge endpoint now fails closed when source purchases, private revisions,
AI outputs, jobs or schools would otherwise be deleted by its cascade. Normal
same-owner import merges preserve these records, except work data explicitly
excluded by consent.

## Deployment and rollback

There is no Tinder schema migration or historical ID rekey. Existing profile
links remain valid. New scoped IDs require the updated upload and replay paths;
rolling back only these paths would make repeat uploads of those profiles fail
identity validation. Keep this compatibility code when reverting other changes.

The existing public Blob storage and existing Tinder source-consent behavior are
unchanged. This does not establish historical archive completeness or add private
storage. Do not run the Hinge historical rekey as part of this Tinder fix.

## Verification

The disposable PostgreSQL regression uses synthetic exports, all repository
migrations, real router/service/transaction code and in-memory Blob transport. It
never uses shared development, production, customer exports or live Blob storage.
Run `bun test:tinder:postgres` with PostgreSQL's `initdb` and `pg_ctl` on PATH.
Run the existing Hinge PostgreSQL regression and `bun check` as well.

Interactive browser QA and a live Blob/auth-provider smoke test are separate
checks. Server integration does not prove the Better Auth browser redirect/cookie
flow. Before release, test a fresh signed-in import, a repeat export, an original
guest sign-in to an existing paid account without a conflicting provider profile,
a conflict that preserves both accounts, and interrupted/repeated submissions.
