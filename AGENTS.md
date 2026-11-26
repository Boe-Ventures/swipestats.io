# SwipeStats Draupnir workspace

The application lives in `apps/standalone-web`. Its AGENTS.md governs product behavior.
Use Bun. Preserve SwipeStats ownership, paid entitlement, consent and account deletion rules.
The web package must remain independently installable with its own lockfile and configuration.
The desktop, extension and Swift packages are inherited starter shells, not ported products.
Use the isolated experiment database for local development and verification.
Never run db:push on shared databases. Production migrations and deployment
require release authorization; follow the web application's release and migration rules.
Preserve the original checkout. Do not send live billing or email requests as test fixtures.
Shared browser and MCP operations use oRPC domains; all resource authorization stays server-side.
Use fictional fixtures in tests and Git. Private local evidence belongs in ignored .migration/.
