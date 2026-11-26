# SwipeStats on Draupnir

An isolated migration experiment preserving SwipeStats history and product routes, with canonical oRPC domains and a scoped OAuth/MCP connector.

- Web: `apps/standalone-web` (self-contained Next.js application).
- Desktop, extension, Swift and shared packages: inherited Draupnir starter shells, not ported SwipeStats clients.
- Run from root: `bun install --frozen-lockfile`, configure the web `.env.local` with a dedicated database, then `bun dev` (port 3200).
- Validate: `bun check` and `bun run build`.
- Export: `bun export:standalone /tmp/swipestats-export` to a new directory, then install and configure that independent package.

[Experiment and verification](docs/experiment.md) · [Love Stories product evaluation](docs/love-stories-product-evaluation.md)

Never reuse production credentials for this experiment. No production deployment or merge has been performed.
