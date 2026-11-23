# SwipeStats on Draupnir experiment

## Current local environment (November 23, 2026)

The expired November 14 database branch has been replaced with
`codex/swipestats-draupnir-20261123` (`br-divine-mud-aglke0yk`) in the same
SwipeStats4 project. It is a fresh isolated branch of production, with copied
production data, a 0.25-1 CU compute, and 300-second idle suspension. It expires
**December 23, 2026 at 07:00 Asia/Bangkok (00:00 UTC)**.

Only this checkout's ignored `apps/standalone-web/.env.local` database URLs were
updated. The Git branch remains `codex/draupnir-experiment`. The local app starts
with `bun dev` at `http://localhost:3200`; the fictional journal preview remains
at `/experiments/love-stories` and still has no persistence.

The fresh parent had two production migrations absent from the old experiment.
Production migrations `0018_watery_silver_sable` and
`0019_message_text_redaction_receipts`, their snapshots, and their journal
entries were copied unchanged from `origin/main` at `9b2fd0e`. Their two nullable
JSON columns were added to the local schema. The former experiment-only OAuth
migration was regenerated as `0020_draupnir_oauth`; its SQL is byte-for-byte
identical to the former `0018_loose_morbius`. It was applied only to the new
experimental branch after verifying all 20 inherited migration hashes and
timestamps. A subsequent `0021_love_stories` migration adds the five private
Love Stories tables described below. The historical migration
description below describes the November 14 run, not the current chain.

`bun check` passed, including migration-history validation, lint/typechecking,
and all 68 tests (281 assertions). The existing HTTP/OAuth verification passed against the
new database, including two authenticated browser pages, owner and admin
boundaries, paid AI denial, three MCP tools, disconnect revocation, and 145
OpenAPI operations. The initial dev browser run reported a hydration mismatch
around streamed metadata; an unchanged rerun passed. Treat this as a remaining
UI validation concern before production rollout, not a proven fix.

Only the schema/migration history was reconciled with current production here;
the newer application changes still need integration. There is still no PR or
Vercel deployment for this experiment. The product direction is now to finish
the SwipeStats migration first, then build Love Stories as a feature with an
independent entry point. Keep its API inside the standalone web app. See the
[data-model discussion draft](love-stories-data-model.md).

## Provenance and scope

SwipeStats source: `2b0ee362bf7e25b5a9e6d6a8b0d07a9fd1285837`.
Draupnir source: `ca517037bc496dda57bca47b986566156cf9364a`.
Reference conversation: `01a1da2b-3b32-70a2-a16b-67833075a9fb` (Towers migration), read across its paginated transcript.
Local branch: `codex/draupnir-experiment`. Original SwipeStats, Love Stories, Draupnir and Towers working directories are untouched.

The original SwipeStats history is retained. Its complete application is moved into `apps/standalone-web`. Native shells are inherited from Draupnir and are not SwipeStats product implementations. This is a local experiment, not a production replacement.

## Architecture

All 23 original tRPC routers and 143 procedures now use canonical oRPC domains under `src/server/domains`. Browser and server callers use `src/domain`; HTTP RPC is `/api/domain`. `/api/rpc/openapi.json` originally described 145 operations, including two new connection-management operations. Love Stories adds 16 operations, bringing the total to 161. Business services, profile ownership and paid entitlement checks remain server-side.

The same canonical operations power three read-only MCP tools at `/api/mcp`: `listMyProfiles`, `getSubscriptionStatus`, and `getMySwipeRankSummary`. OAuth uses Better Auth with PKCE, consent, resource audience, registered account checks, current grant checks and disabled-client checks. Account settings can disconnect a client and reject its existing bearer tokens immediately. No import, billing mutation, admin or raw-message tool is exposed.

Next.js remains at the source lockfile's 16.1.6. Most direct dependencies are pinned to the source lockfile. Deliberate changes include oRPC 2.0.0-beta.34, Better Auth/OAuth provider 1.6.23, MCP server 2.0.0 and Zod 4.5.4. React Query core is pinned to match React Query, avoiding incompatible duplicate peer types under isolated linking. This beta oRPC dependency is an explicit production-readiness consideration.

An exported app has its own Bun lockfile, Next config and source. It needs no workspace package imports. Native shells are optional workspace baggage; shipping only the Next.js package is viable.

## Database isolation

Neon project: `little-breeze-40351572` (SwipeStats4).
Experiment branch: `br-rapid-silence-agpwzenl`, named `codex/swipestats-draupnir-experiment`, created from production for schema/data parity. It expires **2026-11-21 23:59 UTC**. The branch contains copied production data and remains private.

Generated migration `0018_loose_morbius.sql` adds OAuth/JWKS tables only and was applied only to this branch. All 18 previous migrations are retained. No `db:push`, production mutation, deployment or external publishing occurred. Integration tests create fictional accounts and clean them up. Credentials are local, ignored, and excluded from exports.

## Verification

- Production Next.js build: 398 generated pages, preserving dynamic routes as dynamic.
- Real HTTP integration script: anonymous denial; user-owned events; Date round trip; cross-user event deletion denied; admin denial; free-tier AI denial; foreign profile denial; OAuth registration, PKCE, consent and code exchange; three MCP tools; cross-account denial; invalid bearer denial; disconnect rejection; 145 OpenAPI operations.
- Retained Bun suite, static checks and browser/export checks are recorded in the final verification notes below.

Commands: root `bun check`, `bun run build`; web `bun scripts/verify-experiment.ts` (explicitly guarded to this isolated database) and `bun scripts/verify-browser.ts` (local-only browser smoke check).

## Love Stories

November 23 implementation: migration `0021_love_stories` adds Person, Encounter,
Entry and two Entry link tables, only in the isolated branch. Sixteen canonical
oRPC operations implement private CRUD, ordering and export. Create request keys
prevent duplicate captures; versions reject stale edits. Account deletion cascades
records and anonymous transfer preserves them. The guarded
`apps/standalone-web/scripts/verify-love-stories.ts` exercises ownership, cross-owner
links, updates, ordering, source preservation, export, transfer and deletion,
plus browser save/reload and mobile layout, using disposable fictional accounts.
`bun check` passes with 68 tests and 281 assertions.

The temporary save-testing screen is `/experiments/love-stories/workspace`.
The intended product is display-first, with updates through MCP or in-app chat.
[Paper mockups](https://app.paper.design/file/01M832D61ZDPMKY8QMSXHCMDSZ/p-1-0)
show the people overview and person story. Chat and Love Stories MCP tool/grant
wiring remain to be implemented; the existing three read-only tools are unchanged.
See [the current model and implementation boundaries](love-stories-data-model.md).

Open `/experiments/love-stories` to compare integrated and standalone presentations using fictional fixtures. The preview intentionally has no persistence. See [product evaluation](love-stories-product-evaluation.md) for the recommendation, evidence limits and pilot design.

## Before any production rollout

Review the migration and route/auth compatibility; validate actual upload flows, paid checkout/webhooks, email, AI and blob operations in provider test environments; verify OAuth in the intended ChatGPT client; pin a production-ready dependency policy; configure the real issuer/redirect URLs and secrets; review rate limits and client-registration policy. Existing cron definitions are retained for parity and must be reviewed before deployment. Native clients remain starter shells. Love Stories persistence exists, while its
connector/chat experience and production UI remain unfinished.

This experiment does not establish exhaustive UI parity. The existing test suite, type checking, build and selected HTTP/browser flows provide bounded evidence. Source content has existing metadata-length warnings; lint has existing non-blocking warnings. Live provider calls were deliberately unavailable in local configuration.

## Final verification notes (2026-11-14)

`bun check` passes: copy policy, Drizzle migration chain, Velite, ESLint (warnings only), TypeScript and 68 retained tests across 31 files (281 assertions). The HTTP integration script additionally passes two authenticated browser pages and the paid AI boundary. The public browser check passes five pages, both presentation modes, name-only empty state, ephemeral draft, reload clearing, and mobile overflow checks, with zero uncaught browser errors.

Independent export to `/tmp/swipestats-standalone-nov14` completed a frozen-lockfile install and production build outside the workspace. A separate local environment file was added only for validation; the exporter itself excludes credentials. Do not distribute that validation directory with its local environment. Source exports should be created fresh using `bun export:standalone`.

Browser verification found and fixed optional PostHog/Mapbox environment validation preventing hydration without service keys. The test waits for hydration before clicking server-rendered controls. OAuth/MCP verification found and fixed a protocol-version compatibility setting in the starter. Local logs still report unavailable email/analytics integrations; these are not verified provider deliveries.
