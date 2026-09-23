# Research delivery boundaries

Purchased files use selected research tables and a short set of profile-field exclusions in `src/lib/research/dataset-contract.ts`. Research columns flow through as the schema evolves, preserving the research fields and stable IDs. Review new columns on these tables for suitability in research exports.

| Product     | Cohort                    | Current contents                                                  |
| ----------- | ------------------------- | ----------------------------------------------------------------- |
| Free sample | Fixed public demo profile | Profile, metrics, usage and match count                           |
| Starter     | 10 mixed profiles         | Same purchased-file contract                                      |
| Standard    | 1,000 mixed profiles      | Same purchased-file contract                                      |
| Fresh       | 1,000 recent profiles     | Same purchased-file contract                                      |
| Premium     | 3,000 recent profiles     | Same purchased-file contract                                      |
| Academic    | Agreed study cohort       | Reviewed export or fixed research database; messages where agreed |

## Data contract

Paid and manual research selection excludes synthetic profiles (`computed = true`). The public sample deliberately selects named demo profiles. Regular exports query Tinder profiles, aggregate metrics, daily usage and match counts. They do not query account, session, verification or payment tables. Research fields include bios, interests, geography and education. The profile excludes `userId`, `computed`, `llmAnalyzedAt` and `bioOriginal`. Version and database creation/update timestamps are included; these timestamps describe the SwipeStats record, not Tinder account creation. Original bio text remains available to the separate manual redaction workflow. Joined metrics and usage must belong to the selected Tinder profile.

Existing purchased artifacts are immutable in content: changing storage must preserve their bytes, cohort, IDs and dates. Regular files contain message counts. Message-level academic deliveries follow the agreed field manifest. Field selection alone does not establish that text has been redacted or that a dataset is anonymous.

## Access and fulfillment

Export inventory requires a verified admin and returns no customer emails, license keys or source URLs. Existing status lookups use the stored license key as a bearer credential and check local expiry. They read the database without calling Lemon Squeezy. Creating a missing export, retrying generation and downloading validate the license with the provider for the configured store, dataset variant and live/test environment. A revoked license may still read its local status summary; generation retries and downloads reject it. Provider failures remain errors so webhook delivery can retry; they are not acknowledged as non-dataset orders.

Receipt links prefill the license using a URL fragment. Client instrumentation removes it before analytics initialization; old query-string receipts remain supported and are scrubbed too. Lookup and downloads use POST bodies. The download server streams bytes with `private, no-store` headers, preserving legacy JSON and compressed JSONL formats. A reusable native POST target waits for a response acknowledgement before allowing another request. The page reports download initiation; the browser reports transfer progress. Status refreshes preserve the visible export and remain scoped to its license. While the page is open, it polls every three seconds during PENDING or GENERATING and stops on completion or error. File-transfer progress does not trigger polling. Generation and download reservations use conditional database updates.

## Storage plan

This PR keeps the existing public Blob store and server-side streaming download route. The route validates entitlement before reading the file and does not return its storage URL. Anyone who already has a public source URL can still read that object directly.

Private storage configuration, migration tooling and source retirement are deferred to the broader [private Blob rollout plan](private-tinder-export-blob-handoff.md). This PR adds no private-store environment variable or migration command.

## Manual export and anonymization

`export-research-dataset.ts` produces private local input for `anonymize-research-dataset.ts`. It retains `profile`, allowlisted research geography under `user`, `meta`, `usage`, `matches`, and message text. The `user` object selects geography fields explicitly; it is not a serialized account record. Raw research text is needed as input to the offline redaction workflow, so no pre-populated `contentSanitized` column is required.

The exporter writes a mode-0600 `.partial` file and renames it on completion. No model calls or backfills run as part of export. Run redaction only with the intended authorization, inspect errors and review the finished artifact before sharing it. The existing offline anonymizer can retain text after an analysis error; its output must not be treated as automatically approved for delivery.

The public sample keeps its existing content and IDs. Its generator uses the same purchased-file profile exclusions. The separate marketing showcase at `/demo-profile.json` is outside the purchased export path.

## Academic database procedure

Use an isolated dated snapshot with a SQL-created research login, no role memberships or role/database creation privileges, and SELECT only on agreed research views. Keep account, session, verification, payment and fulfillment records inaccessible. Test actual reads as the research role, plus write and role-escalation permissions. Preserve the agreed fields and messages. Prefer explicit columns; Postgres expands `SELECT *` when a view is created, so an existing view does not automatically gain new base-table columns.

## Verification

Run `bun test src/lib/research` and the repository gate `bun check`. Tests cover the data contract, product entitlement, admin authorization, status/retry/download checks, public storage URL validation, receipt handling, webhook provider failure and manual pipeline compatibility. Live delivery still needs browser verification; the private storage plan has its own acceptance checks.
