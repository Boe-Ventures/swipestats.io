# SwipeStats Draupnir experiment

The application lives in `apps/standalone-web`. Its AGENTS.md governs product behavior.
Use Bun. Preserve SwipeStats ownership, paid entitlement, consent and account deletion rules.
The web package must remain independently installable with its own lockfile and configuration.
The desktop, extension and Swift packages are inherited starter shells, not ported products.
Only use the isolated experiment database. Never run db:push on shared databases.
Production, the original checkout, live billing, email and deployment are outside this experiment.
Shared browser and MCP operations use oRPC domains; all resource authorization stays server-side.
Use fictional fixtures in tests and Git. Private local evidence belongs in ignored .migration/.
