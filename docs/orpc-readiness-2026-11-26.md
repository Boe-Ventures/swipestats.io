# SwipeStats oRPC readiness, November 26, 2026

The experiment is ready for local test driving. No core oRPC migration regression
was found in the checks below. This is bounded validation, not production signoff.

Reviewed experiment commit: `113a81f`. Fetched `origin/main`: `139b646`.
Subsequent local integration brings `139b646` into the experiment, including
all seven changed paths under `apps/standalone-web`. The earlier missing-main
finding is resolved.

## Local environment

- Web app: `http://localhost:3200`, bound to loopback.
- Journal: `/app/love-stories`; the older `/experiments/love-stories/workspace`
  entry point also works.
- Database: the isolated `codex/swipestats-draupnir-20261123` branch documented
  in `experiment.md`. Both pooled and direct hostnames were checked before tests.
- All 23 local migration SQL hashes and timestamps match the applied journal,
  including `0020_draupnir_oauth`, `0021_love_stories`, and
  `0022_swipestats_api_keys`. All five Love Stories tables exist.
- No production migrations or deployment were performed.

## Evidence

- `bun check` passed: copy policy, migration history, Velite, lint, TypeScript,
  and 93 tests across 40 files with 369 assertions. Existing content and lint
  warnings remain.
- All 23 original routers matched current main after normalizing imports,
  error-class names, handler/context syntax, router wrappers, and formatting.
  This checks handler-body parity; it does not prove every transport or UI flow.
- Live HTTP checks passed anonymous denial, event ownership, cross-user deletion
  denial, Date round trips, admin and paid AI boundaries, OAuth PKCE/consent,
  three OAuth-visible MCP tools, account isolation, and immediate disconnect.
- Added HTTP checks confirm GET cannot invoke mutations through either
  `/api/domain` or `/api/rpc`. OpenAPI requests enforce authentication,
  ownership, and input validation. The generated specification has 164 paths.
- API-key/MCP checks passed safe listing, hashed credentials, both supported
  headers, no session escalation, read/write scopes, default/finite/never
  expiry, disabled/banned/guest owners, rate limits, revocation, account
  deletion, all 16 Love Stories tools, dates, replay safety, and stale edits.
- Love Stories HTTP/database checks passed private CRUD, request replay,
  optimistic concurrency, ordering, cross-account links, exact original text,
  export, account transfer, and cascading deletion.
- Disposable local PostgreSQL Tinder and Hinge regressions passed ownership,
  import preservation, consent, guest conversion, rollback, and archive retention.
- The internal browser confirmed signed-in dashboard hydration with existing
  profiles and navigation to the persisted Love Stories journal, without
  reported console errors. Browser save/reload and mobile checks were not rerun
  in this audit; prior evidence is recorded in `experiment.md`.
- A fresh standalone export at `/tmp/swipestats-standalone-20261126-audit`
  installed with its own frozen lockfile and passed a production build with
  400 pages. It contains no copied environment file. The build inherited the
  isolated experiment environment explicitly. The running dev app was unaffected.

The handwritten event/newsletter invalidation keys still match this installed
oRPC version's path-prefix keys. They were investigated and are not a finding.
RPC GET rejection also agrees with the
[oRPC handler documentation](https://orpc.dev/docs/rpc/handler).

## Before production

1. Resolved locally: integrated `139b646` / PR #100, the newer Profile Compare
   marketing page and its navigation, sitemap, and analytics changes. All
   seven incoming files match main at their standalone-web paths. Browser
   validation confirmed the page, navigation, and interactive photo preview.
2. Verify Vercel builds `apps/standalone-web` with the intended lockfile,
   environment, redirects, and cron configuration. The actual Vercel project
   settings were not inspected in this audit.
3. Plan and apply pending generated migrations to the intended deployment
   database before activating code that requires them. The standalone build
   intentionally does not run database migrations. Only the experimental
   database's applied state was inspected.
4. Validate real upload/blob flows, checkout and webhooks, email, paid AI,
   existing-session continuity, and the intended external OAuth client in
   appropriate test environments. Passing local mocks and authorization-denial
   checks does not establish successful provider delivery or payments.
5. Explicitly accept the pinned oRPC `2.0.0-beta.34` dependency and the Better
   Auth `1.6.23` upgrade. Review production OAuth client registration, issuer
   URLs, and rate limits. The legacy `/api/trpc` transport is removed, so old
   browser tabs or external callers need the new client or a refresh.

## Changes from this audit

The initial audit changed verification scripts and this report. `verify-experiment.ts` now
checks both HTTP transports. `verify-love-stories.ts` supports the same
`EXPERIMENT_SKIP_BROWSER=1` switch as the general verifier, with encounter-count
expectations adjusted to whether the browser fixture runs. The initial
HTTP-only run hit the old browser-dependent count assertion; the corrected run
passed. Targeted lint and TypeScript passed after these changes.

Private logs and normalized router comparisons are in ignored `.migration/`.
The audit itself made no commits, merges, or production changes. The later
user-requested integration merges main into the local experiment branch only.

## Local release preparation, November 26

- Integrated the requested mobile layout, shared demo frame, Messages Sent and
  Match Rate label updates. The detailed cohort comparison now requires an active
  Plus or Elite entitlement in the canonical server procedure as well as the UI.
  Regression checks cover free and expired accounts, stale paid sessions,
  active and lifetime plans, and ownership. Basic SwipeRank remains separate.
- Removed Love Stories from the app header and shared account dropdown. The
  authenticated direct route remains available for ongoing local testing.
- Restored the existing public Mapbox token in the ignored local experiment
  environment. No credentials are committed. Without a token the directory now
  renders a map-unavailable message and a link to the working profile grid.
- Browser checks confirmed the missing-token fallback, restored map rendering
  without console errors, and both navigation removals. Earlier checks covered
  mobile demo layouts, comparison controls, and the paid upgrade prompt.
- Final `bun check` passed: 96 tests in 41 files, with zero lint errors and ten
  existing warnings. A fresh standalone export at
  `/tmp/swipestats-standalone-20261126-release` passed frozen-lockfile installation
  and a production build using the isolated experiment environment. No environment
  file was copied. The new entitlement spec was explicitly included because the
  exporter selects tracked paths and it was not yet tracked at export time.
- Private validation logs are in `.migration/release-*-2026-11-26.log`.

This is a local review checkpoint, not a production deployment. Items 2 through
5 in the rollout checklist above remain to be resolved before launch. In
particular, the public Mapbox token must be available at build time in the
target deployment environment.
