# Draupnir Extension

Official WXT React scaffold adapted for the Bun workspace. Its popup validates a draft with `@draupnir/contracts`. No platform scraping, host permissions, or backend authentication is included in this starter.

```sh
bun install --frozen-lockfile
bun run dev:extension
bun run build:extension
bun run --cwd apps/extension build:firefox
```

Load `apps/extension/.output/chrome-mv3` as an unpacked extension after building. Add API transport, authentication and narrowly scoped host permissions when implementing a real feature.
