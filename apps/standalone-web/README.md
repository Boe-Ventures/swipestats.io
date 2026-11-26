# SwipeStats standalone web experiment

This self-contained Next.js 16 package runs independently or inside the Draupnir experiment workspace. Use Bun 1.4.0.

```sh
bun install --frozen-lockfile
# Configure .env.local with a dedicated experiment database and fresh auth secret.
bun run dev:direct --port 3200
bun run check
bun run build
```

Set `NEXT_PUBLIC_BASE_URL=http://localhost:3200` locally. The database must include the checked-in migrations. Use `bun db:generate` and `bun db:migrate` on a dedicated branch, never `db:push` on shared databases. Do not copy production or shared-development secrets into this experiment.

Local validation used `SKIP_ENV_VALIDATION=1` with real isolated database URLs, a fresh `BETTER_AUTH_SECRET`, a fresh `SWIPE_RANK_PUBLIC_ID_SECRET`, and a non-working billing placeholder. Email, AI, payments and storage require separate provider test configurations before those flows can be validated. Mapbox and PostHog are optional; missing keys must not prevent hydration.

- Canonical API: `src/server/domains`, HTTP `/api/domain`.
- Browser and SSR clients: `src/domain`.
- OpenAPI: `/api/rpc/openapi.json`.
- Scoped read-only OAuth/MCP connector: `/api/mcp`.
- Connection management: account settings.
- Fictional Love Stories product preview: `/experiments/love-stories`.

`bun scripts/verify-browser.ts` checks local public pages and the preview. `bun scripts/verify-experiment.ts` is deliberately guarded to the original isolated experiment database and creates/cleans fictional accounts. It is not a production diagnostic.

The application has no imports from workspace packages. The `bun.lock` in this directory is for independent installs. Workspace installs use the root lockfile. Existing cron definitions remain for migration parity and require review before deployment. The original migration SQL and snapshots are preserved byte-for-byte.
