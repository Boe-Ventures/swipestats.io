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

Current SwipeStats `main` at `9b2fd0e29985126fec82d3b2e4becb2b9e9aec59`
is now merged into this experiment. The newer Tinder/Hinge ownership and import
safeguards, guest conversion protections, password reset, research text redaction,
and branding are included. Changed routers, upload screens and regression fixtures
use oRPC. Love Stories persistence and the existing OAuth/MCP connection remain
intact. Upload retries read oRPC's top-level error code, and upload-context
invalidation uses the oRPC query key. All 91 changed upstream paths were accounted
for in the standalone app. No additional database migration was needed for this merge.

Validation after the merge:

- `bun check`: copy policy, migration history, lint (10 warnings, no errors),
  TypeScript, and 93 passing tests across 40 files (369 assertions).
- Disposable local PostgreSQL regressions: Tinder and Hinge ownership, import
  preservation, consent, archive retention, conversion and rollback.
- Isolated-database HTTP/OAuth checks: two authenticated browser pages, ownership,
  admin and paid AI boundaries, PKCE/consent, three MCP tools, account isolation,
  disconnect revocation, and 161 OpenAPI operations.
- Love Stories checks: private CRUD, replay/stale-edit handling, ordering, links,
  export, account transfer/deletion, browser save/reload and mobile layout.
- Public browser checks: five pages, both presentation modes, name-only empty state,
  fictional draft/reload behavior, mobile overflow and zero uncaught browser errors.
- Independent export to `/tmp/swipestats-standalone-main-nov23`: frozen-lockfile
  install and production build passed outside the monorepo. Validation inherited
  this checkout's isolated environment; no environment file was copied into the export.

The earlier streamed-metadata hydration mismatch did not recur in these browser
checks. These are bounded checks, not exhaustive production UI/provider validation.
There is still no PR or Vercel deployment for this experiment. The product direction
is to finish the SwipeStats migration first, then build Love Stories as a feature
with an independent entry point. Keep its API inside the standalone web app. See the
[data-model discussion draft](love-stories-data-model.md).

## Provenance and scope

Original SwipeStats source: `2b0ee362bf7e25b5a9e6d6a8b0d07a9fd1285837`.
Integrated main: `9b2fd0e29985126fec82d3b2e4becb2b9e9aec59` (November 23, 2026).
Draupnir source: `ca517037bc496dda57bca47b986566156cf9364a`.
Reference conversation: `01a1da2b-3b32-70a2-a16b-67833075a9fb` (Towers migration), read across its paginated transcript.
Local branch: `codex/draupnir-experiment`. Original SwipeStats, Love Stories, Draupnir and Towers working directories are untouched.

The original SwipeStats history is retained. Its complete application is moved into `apps/standalone-web`. Native shells are inherited from Draupnir and are not SwipeStats product implementations. This is a local experiment, not a production replacement.

## Architecture

All 23 original tRPC routers and 143 procedures now use canonical oRPC domains under `src/server/domains`. Browser and server callers use `src/domain`; HTTP RPC is `/api/domain`. `/api/rpc/openapi.json` originally described 145 operations, including two new connection-management operations. Love Stories adds 16 operations, bringing the total to 161. Business services, profile ownership and paid entitlement checks remain server-side.

The same canonical operations power three read-only MCP tools at `/api/mcp`: `listMyProfiles`, `getSubscriptionStatus`, and `getMySwipeRankSummary`. OAuth uses Better Auth with PKCE, consent, resource audience, registered account checks, current grant checks and disabled-client checks. Account settings can disconnect a client and reject its existing bearer tokens immediately. No import, billing mutation, admin or raw-message tool is exposed.

Next.js remains at the source lockfile's 16.1.6. Most direct dependencies are pinned to the source lockfile. Deliberate changes include oRPC 2.0.0-beta.34, Better Auth/OAuth provider 1.6.23, MCP server 2.0.0 and Zod 4.5.4. React Query core is pinned to match React Query, avoiding incompatible duplicate peer types under isolated linking. This beta oRPC dependency is an explicit production-readiness consideration.

An exported app has its own Bun lockfile, Next config and source. It needs no workspace package imports. Native shells are optional workspace baggage; shipping only the Next.js package is viable.

## Original database isolation (November 14, superseded)

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
`bun check` now passes with 93 tests and 369 assertions after integration with main.

The working screen is `/app/love-stories`, available beside Dashboard and Photos
and in the account menu. It uses the authenticated app layout and keeps the private
content analytics masking. The standalone testing route at
`/experiments/love-stories/workspace` remains available. Browser QA on November 23
confirmed that the new header link opens the signed-in workspace, keeps the app
navigation visible, and appears in the account menu, with no browser console errors.
The testing forms use shared Select, Calendar/Popover, Input, Textarea and
InputGroup controls. Person fields are grouped into six always-visible sections;
encounters into contact, timing, place and reflection. Headings and dividers organize
fields without collapsible panels. Accordions remain outside forms for original
wording and removal actions. The browser verification script uses the shared select
controls and directly accesses all form fields.

The intended product is display-first, with updates through MCP or in-app chat.
[Paper mockups](https://app.paper.design/file/01M832D61ZDPMKY8QMSXHCMDSZ/p-1-0)
show the people overview and person story. Chat remains to be implemented.
Love Stories MCP is now available through explicitly scoped API keys.
See [the current model and implementation boundaries](love-stories-data-model.md).

Open `/experiments/love-stories` to compare integrated and standalone presentations using fictional fixtures. The preview intentionally has no persistence. See [product evaluation](love-stories-product-evaluation.md) for the recommendation, evidence limits and pilot design.

## Personal API keys (2026-11-23)

SwipeStats now follows the Cockpit and Bifrost API-key pattern using
`@better-auth/api-key` 1.6.23. Account Settings offers named personal keys with
30, 90 or 365 day expiry (90 by default), one-time copying and revocation.
Only hashes are stored. The `apikey` table comes from generated migration
`0022_swipestats_api_keys`, applied only to the isolated experiment database.
The standalone and workspace lockfiles include the dependency.

MCP accepts `Authorization: Bearer swipestats_...` or `x-api-key` at `/api/mcp`.
Keys have the fixed `swipestats:read` permission and 120 requests per minute.
Each request checks the live owner and grant. Keys cannot establish browser
sessions or issue other keys. Session-only oRPC operations manage keys, with
owner-filtered lists and revocation; public plugin management endpoints are
blocked. OAuth remains supported. OpenAPI now contains 164 operations.

The base grant enables the existing three read-only MCP tools. At creation, a
key may additionally request Love Stories read access (six tools) or read/write
access (all sixteen tools). Existing keys and OAuth grants gain no new access.
The tool catalog is filtered by scope, with a live grant check before execution. No real
user key has been issued, no external connector configured, and no deployment
performed by this change.

The HTTP-only `scripts/verify-api-keys.ts` uses disposable fictional accounts
and checks hashed storage, safe listing, owner isolation, both headers,
no browser-session escalation, permission enforcement, expiry, disabled keys,
banned/guest owners, rate limits, revocation and account-deletion cascade.
Existing OAuth/ownership checks can run without their browser section using
`EXPERIMENT_SKIP_BROWSER=1`; browser review uses computer navigation separately.

Validation passed: the API-key HTTP checks, existing OAuth PKCE/consent and
disconnect checks, `bun check` (93 tests, 369 assertions), and an independent
frozen-lockfile install. Browser review confirmed the signed-in key controls and
expiry selector. Real-account key issuance was left to the user.

The expanded HTTP check also passes all sixteen Love Stories tools, read/write
scope isolation, foreign record and link rejection, capture replay handling,
stale-version rejection, ISO date transport, undated story ordering, original
wording preservation, export and deletion. Browser QA confirmed the access
selector and explicit read/write description without issuing a personal key.

## Before any production rollout

Review the migration and route/auth compatibility; validate actual upload flows, paid checkout/webhooks, email, AI and blob operations in provider test environments; verify OAuth in the intended ChatGPT client; pin a production-ready dependency policy; configure the real issuer/redirect URLs and secrets; review rate limits and client-registration policy. Existing cron definitions are retained for parity and must be reviewed before deployment. Native clients remain starter shells. Love Stories persistence exists, while its
external connector setup, in-app chat and production UI remain unfinished.

This experiment does not establish exhaustive UI parity. The existing test suite, type checking, build and selected HTTP/browser flows provide bounded evidence. Source content has existing metadata-length warnings; lint has existing non-blocking warnings. Live provider calls were deliberately unavailable in local configuration.

## Final verification notes (2026-11-14)

`bun check` passes: copy policy, Drizzle migration chain, Velite, ESLint (warnings only), TypeScript and 68 retained tests across 31 files (281 assertions). The HTTP integration script additionally passes two authenticated browser pages and the paid AI boundary. The public browser check passes five pages, both presentation modes, name-only empty state, ephemeral draft, reload clearing, and mobile overflow checks, with zero uncaught browser errors.

Independent export to `/tmp/swipestats-standalone-nov14` completed a frozen-lockfile install and production build outside the workspace. A separate local environment file was added only for validation; the exporter itself excludes credentials. Do not distribute that validation directory with its local environment. Source exports should be created fresh using `bun export:standalone`.

Browser verification found and fixed optional PostHog/Mapbox environment validation preventing hydration without service keys. The test waits for hydration before clicking server-rendered controls. OAuth/MCP verification found and fixed a protocol-version compatibility setting in the starter. Local logs still report unavailable email/analytics integrations; these are not verified provider deliveries.
