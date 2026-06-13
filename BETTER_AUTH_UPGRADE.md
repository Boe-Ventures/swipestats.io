# Better Auth upgrade: 1.4.18 → 1.6.14

> Do this **after** the profile-compare-ux work is merged to prod (PR #14), as its **own isolated PR/branch off `main`**. Don't bundle an auth-library bump with a feature deploy.

## TL;DR

- **Current:** `better-auth@1.4.18` · **Latest:** `1.6.14` (two minors: 1.4 → 1.5 → 1.6)
- `package.json` already allows it (`"better-auth": "^1.4.16"`), so it's a **lockfile bump** — no range edit needed.
- **Risk: LOW.** Every documented breaking change targets features we don't use. Only two minor behavior nuances apply, both non-breaking for us. Schema almost certainly needs no changes.
- **Effort:** ~1–2h, mostly smoke-testing the auth flows.

## What we actually use (so you can judge impact)

- Server (`src/server/better-auth/config.ts`): `betterAuth({ ... })` with email/password (`requireEmailVerification: false`), plugins **`username` / `admin` / `anonymous`**, `drizzleAdapter(db, { provider: "pg", schema })`, `experimental: { joins: true }`, `nextCookies`, `emailVerification.sendVerificationEmail` (Resend), and `databaseHooks` after-hooks (analytics via `trackServerEvent`).
- Client (`src/server/better-auth/client.ts`): `createAuthClient` (react) + `usernameClient` / `adminClient` / `anonymousClient`; `type Session = typeof auth.$Infer.Session`.
- APIs used: `useSession`, `signIn.anonymous`, `signIn.username`, `signUp.email`, `signOut`, `verifyEmail`, `sendVerificationEmail`, `requestPasswordReset`, `resetPassword`, `isUsernameAvailable`, `changeEmail`, `auth.api.getSession`, `auth.api.signOut`.

## Breaking changes — and whether they hit us

| Change (1.5.0 / 1.6.0) | Affects us? |
|---|---|
| `/forget-password/email-otp` endpoint removed | **No** — we use standard `requestPasswordReset`/`resetPassword` |
| api-key plugin extracted → `@better-auth/api-key` | **No** — not used |
| `better-auth/adapters/test` + `@better-auth/core/utils` barrel removed | **No** — not imported |
| Deprecated types removed (`InferSession`, `InferUser`, `createAdapter`, `Adapter`) | **No** — we use `auth.$Infer.Session` (verified, none of the removed ones used) |
| Secondary-storage session `id` removed | **No** — no secondary storage |
| SAML `InResponseTo` default-on (1.6) | **No** — no SAML |
| MongoDB native UUID (1.6) | **No** — Postgres |
| **DB `after` hooks now run AFTER commit, not during (1.5)** | **Verify** — our 4 after-hooks are fire-and-forget `try/catch` analytics; post-commit is fine (arguably more correct). Expect no breakage. |
| **`freshAge` measured from `createdAt`, not `updatedAt` (1.6)** | **Verify** — we set no session config (defaults). Only affects the "fresh session" window for `changeEmail`/`resetPassword`. If it nags, set `session: { freshAge: <seconds> }` (or `0` to disable). |

**Schema:** 1.6.0 notes say **no new required columns** for user/session/account/verification. All admin-plugin fields we need already exist in `schema.ts` (`role`, `banned`, `banReason`, `banExpires`, `session.impersonatedBy`). Expect a clean schema diff — but confirm in step 3.

**One flag to confirm:** `experimental: { joins: true }` (config.ts:~20). Experimental flags can graduate/move between minors — confirm it's still a valid option in 1.6 (if it graduated, drop the `experimental` wrapper).

## Runbook

```bash
# 1. Bump (updates bun.lock; package.json range already covers it)
bun add better-auth@1.6.14

# 2. Typecheck — catches any removed-type usage (we have none)
bun check

# 3. Confirm the DB schema still matches what Better Auth expects.
#    Expect: NO changes. If it wants new columns, add them to schema.ts +
#    generate a Drizzle migration (and hand the migrate command over — do not
#    run db:migrate/db:push against the DB without explicit approval).
npx @better-auth/cli@latest generate

# 4. Build sanity
bun build   # or just `next build`; velite output already exists
```

4b. Confirm `experimental.joins` is still a valid `betterAuth` option (grep the installed types or TS will flag it).

## Smoke test (the flows we actually use)

- [ ] Sign up (email/password)
- [ ] Sign in — **email** and **username**
- [ ] **Anonymous** session + conversion to a real account
- [ ] Sign out
- [ ] Email verification link (Resend) — sends + verifies
- [ ] Password reset (`requestPasswordReset` → `resetPassword`)
- [ ] `changeEmail` (watch the `freshAge` nuance)
- [ ] `useSession` reactivity in the app
- [ ] Admin role check still gates admin routes

Then deploy the branch to a Vercel preview and run the above against it. (Preview auth now works on per-deploy URLs thanks to the `trustedOrigins` wildcard added in this branch — `https://swipestats-*.vercel.app`.)

## Rollback

`git revert` the bump commit and `bun install` to restore `1.4.18`. No schema down-migration needed if step 3 was clean (no columns were added).

## Sources

- Breaking changes pulled from the GitHub release notes for `v1.5.0` and `v1.6.0` (github.com/better-auth/better-auth/releases).
