# Local development

Run `bun run dev` from the repository root or web package. This checkout uses **local** by default.

- `dev:local`: private HTTPS at `https://<checkout-id>.swipestats-draupnir.localhost:1355`. Portless starts its loopback proxy automatically. The first launch may require trusting its local CA.
- `dev:shared`: use the explicitly configured LocalCan integration origin, if present. Start that project in LocalCan first. The launcher validates its exact service target and refuses another checkout's ownership lock. It never starts, publishes, or rewrites a tunnel.
- `dev:direct --port 3200`: explicit loopback escape hatch for diagnostics. Different apps and ports use different dev cookie names.
- `dev:doctor`: show the checkout, canonical URL, and observed runtime health without printing secrets.
- `test:local-dev`: launcher regression checks (no database or provider calls).

Install dependencies with this repository's package manager before launching. Portless is pinned to 0.15.4. The launcher requires Node 24 or newer. Do not invoke `dev:server` directly; it is the internal command used after origin selection. Avoid `portless --force` and static aliases.

The checkout ID hashes the real checkout path, so detached worktrees and branches with equal names cannot steal one another's URLs. Moving a checkout changes its URL. The ephemeral backend port is separate from the public origin. The launcher overrides configured origin variables before Next starts, so browser bundles, server auth, and generated links agree. Production builds do not use this launcher or its dev cookie prefix.

Existing localhost sessions do not transfer to the new hostname. Sign in once at the printed URL and bookmark it. The launcher leaves other apps' cookies intact. Shared mode disables the passwordless `/api/dev/login` helper. Use normal authentication there. Google OAuth does not accept `.localhost` subdomains: use a registered shared HTTPS callback for provider/device testing.

LocalCan's fixed target must match `local-dev.json`. Shared leases live under `${XDG_STATE_HOME:-~/.local/state}/boe-dev`. A crashed launcher leaves its lease for safety; inspect its recorded PID and checkout before removing that exact lock. Never delete another live launcher's lock. A busy backend port or missing LocalCan daemon is an error, never a silent fallback.

`local-dev.json` is application configuration; `scripts/local-dev.mjs` and its test are identical vendored copies of the workspace launch contract. Keep fixes synchronized across adopters. They have no imports outside this web package, including when a standalone app is exported. Native service profiles, credentials, and ports are independent of this web launcher.

The launcher health check confirms HTTP availability only. Successful sign-in, logout isolation, OAuth, native devices, streaming, and uploads require their own smoke checks.
