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

For repeat uploads, the server loads only the current user's profile. If its
signup instant matches, the server updates it additively under its existing ID.
This preserves old public links and guest-created v3 IDs after a legitimate
account transfer. Different signup times retain the existing forward-merge
rules, with new destinations also scoped to the current user. Existing
transactional ownership predicates and upload leases remain in force.

The old `create` and `update` RPC names delegate to the current procedures, so
legacy clients cannot follow a different ownership policy. Admin reprocessing
accepts both historical IDs and scoped IDs, but verifies the stored signup and
owner before processing an existing row.

No schema migration or historical ID rewrite is required. Existing orphaned
profiles are not claimed. Public profile IDs remain 64 hexadecimal characters.

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
validation. Existing service tests retain consent and transaction ownership
coverage. The harness does not claim to test live database concurrency.

Manual browser QA to perform on the preview with synthetic exports:

1. Upload as a guest, then open a separate browser session and upload the same
   files. Both sessions should reach separate insights URLs.
2. Upload the same files again in either session. Its insights URL should stay
   unchanged and activity should be deduplicated.
3. Sign up from a guest browser, then upload again. Its original insights URL
   should remain unchanged.
4. Verify the recovery guidance is visible on a fresh upload and that sign-in
   opens the existing sign-in flow.

Browser QA and a production account-specific diagnosis are not part of the
mocked regression results.
