# Draupnir Desktop

Official `create-tauri-app` React/TypeScript scaffold, adapted for the Bun workspace. The sample validates input using `@draupnir/contracts` and invokes the native Rust greeting command. It does not yet implement backend authentication.

From the monorepo root:

```sh
bun install --frozen-lockfile
bun run dev:desktop
bun run build:desktop
```

Requires Rust/Cargo and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/). `bun run --cwd apps/desktop build` builds only the frontend; `build:desktop` builds the native application. The starter retains the official scaffold's default capabilities; review them when adding native features.
