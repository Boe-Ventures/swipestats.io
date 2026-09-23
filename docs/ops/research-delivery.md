# Research delivery boundaries

Purchased files use selected research tables and the existing internal profile-field exclusions in `src/lib/research/dataset-contract.ts`. Research columns flow through as the schema evolves, preserving the research fields and stable IDs. Review new columns on these tables for suitability in research exports.

| Product     | Cohort                    | Current contents                                                  |
| ----------- | ------------------------- | ----------------------------------------------------------------- |
| Free sample | Fixed public demo profile | Profile, metrics, usage and match count                           |
| Starter     | 10 mixed profiles         | Same purchased-file contract                                      |
| Standard    | 1,000 mixed profiles      | Same purchased-file contract                                      |
| Fresh       | 1,000 recent profiles     | Same purchased-file contract                                      |
| Premium     | 3,000 recent profiles     | Same purchased-file contract                                      |
| Academic    | Agreed study cohort       | Reviewed export or fixed research database; messages where agreed |

## Data contract

Regular exports query Tinder profiles, aggregate metrics, daily usage and match counts. They do not query account, session, verification or payment tables. Research fields include bios, interests, geography and education. Application `userId` and other previously excluded internal profile fields remain excluded. Joined metrics and usage must belong to the selected Tinder profile.

Existing purchased artifacts are immutable in content: changing storage must preserve their bytes, cohort, IDs and dates. Regular files contain message counts. Message-level academic deliveries follow the agreed field manifest. Field selection alone does not establish that text has been redacted or that a dataset is anonymous.

## Access and fulfillment

Export inventory requires a verified admin and returns no customer emails, license keys or source URLs. Status, retry and download require a valid license for the configured store, dataset variant and live/test environment. Expired and revoked entitlements fail closed. Provider failures remain errors so webhook delivery can retry; they are not acknowledged as non-dataset orders.

Receipt links prefill the license using a URL fragment. Client instrumentation removes it before analytics initialization; old query-string receipts remain supported and are scrubbed too. Lookup and downloads use POST bodies. The download server streams bytes with `private, no-store` headers, preserving legacy JSON and compressed JSONL formats. A reusable native POST target waits for a response acknowledgement before allowing another request. The page reports download initiation; the browser reports transfer progress. Status refreshes preserve the visible export and remain scoped to its license. Generation and download reservations use conditional database updates.

## Storage rollout

The app can read both existing public Blob files and private Blob files. Without `RESEARCH_BLOB_READ_WRITE_TOKEN`, new generation retains the existing public store and `BLOB_READ_WRITE_TOKEN`. Setting the dedicated private token switches new uploads to private storage. Once configured, a private upload failure never falls back to public storage.

This compatibility keeps existing purchases usable during deployment. Updating an export pointer leaves the source object in its original store until the source-removal step.

1. Deploy the dual-reader and access checks first.
2. Provision a dedicated private Vercel Blob store. Set `RESEARCH_BLOB_READ_WRITE_TOKEN` in the intended environments. Verify a new paid export and entitled download in a test environment.
3. With separate operational authorization, run `bun src/scripts/research/migrate-purchased-files.ts` for a dry-run inventory, then `--apply --manifest /private/path/research-migration.jsonl` to copy existing artifacts. Choose a private manifest path appropriate to the operator environment. The tool streams the original bytes, verifies the entire private copy with SHA-256 and byte count, records a private manifest, then conditionally switches the export pointer. It preserves license terms and download counts.
4. Verify real entitled downloads. Source retirement needs deletion authorization: `--apply --manifest /private/path/research-migration.jsonl --remove-public-source` removes each public source after switching and checks its URL. For staged retirement, use the old URLs recorded in the private manifest. A previously migrated object is no longer selected on rerun.
5. Keep the manifest for rollback and recovery. If interrupted, inspect the recorded phase and current pointer before resuming.

Run storage provisioning, migration and source removal as explicit deployment steps. Verify downloads in the target environment before completing the rollout.

## Manual export and anonymization

`export-research-dataset.ts` produces private local input for `anonymize-research-dataset.ts`. It retains `profile`, allowlisted research geography under `user`, `meta`, `usage`, `matches`, and message text. The `user` object selects geography fields explicitly; it is not a serialized account record. Raw research text is needed as input to the offline redaction workflow, so no pre-populated `contentSanitized` column is required.

The exporter writes a mode-0600 `.partial` file and renames it on completion. No model calls or backfills run as part of export. Run redaction only with the intended authorization, inspect errors and review the finished artifact before sharing it. The existing offline anonymizer can retain text after an analysis error; its output must not be treated as automatically approved for delivery.

The public sample keeps its existing content and IDs. Its generator uses the same purchased-file profile exclusions. The separate marketing showcase at `/demo-profile.json` is outside the purchased export path.

## Academic database procedure

Use an isolated dated snapshot with a SQL-created research login, no role memberships or role/database creation privileges, and SELECT only on agreed research views. Keep account, session, verification, payment and fulfillment records inaccessible. Test actual reads as the research role, plus write and role-escalation permissions. Preserve the agreed fields and messages. Prefer explicit columns; Postgres expands `SELECT *` when a view is created, so an existing view does not automatically gain new base-table columns.

## Verification

Run `bun test src/lib/research` and the repository gate `bun check`. Tests cover the data contract, source-file preservation, product entitlement, admin authorization, status/retry/download checks, storage selection, receipt handling, webhook provider failure and manual pipeline compatibility. Provider configuration and live delivery still need the rollout checks above.
