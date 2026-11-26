// design-sync browser shim: bundled next/link + next/image internals read
// process/env; the design runtime has no Node globals. Imported first from
// .ds-entry.ts so it runs before every component module.
(globalThis as unknown as { process?: unknown }).process ??= {
  env: { NODE_ENV: "development" },
  platform: "browser",
  versions: {},
};
export {};
