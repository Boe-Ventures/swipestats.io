# Tinder upload ownership and guest recovery

## Problem and behavior

The browser's legacy Tinder fingerprint hashes birth date and account creation
instant. It is not Tinder's native account ID or cryptographic proof of ownership.
Per the product owner's recovery policy, a registered user submitting a complete,
validated export with the same fingerprint can reclaim a free guest profile.
The JSON is unsigned, so a deliberately fabricated export is a residual risk.

Recovery checks the source again within the import transaction. Registered users,
verified email identities and guests with linked credential/OAuth accounts cannot
be reclaimed. Paid guests, subscription metadata, purchases and profile-linked AI
artifacts require support-assisted recovery. A signed-in user's paid tier is never
changed. An anonymous destination cannot reclaim a lost session.

Claiming, refreshing derived analytics and moving the guest's Tinder archive
references commit together. Failures roll back ownership as well as import writes.
The legacy profile ID and previous accepted source files remain. The old guest
account is never deleted; unrelated providers, preferences and billing stay there.
A repeated committed submission returns the same owned profile.

Profiles belonging to another registered user are never transferred. The user may
still import their own export independently under a server-derived owner-scoped ID.
New profiles without a recoverable legacy ID use this same scoped identity. This
recovery path intentionally targets legacy IDs, not new owner-scoped guest IDs.
The upload context is advisory and exposes only the current owner's profile;
recovery occurs only after the authenticated upload mutation validates the export.

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
storage. Retained source JSON is the existing consent-filtered upload payload,
not an untouched Tinder export or Hinge ZIP; this PR does not fulfill a promise
to retain every raw source field. Do not run the Hinge historical rekey as part of this Tinder fix.

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
