# tabs

2026-07-12, transformation engine, migrated Trigger to Tab and Content to Panel with Base UI state hooks.

## Changed

- `src/components/ui/tabs.tsx:3` maps active styling to `data-active` and adds Base UI's aria-disabled hook.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/tabs.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing tab consumers use string values that remain valid.

## Behavior changes

- `TabsList` opts into `activateOnFocus` by default to preserve Radix's automatic keyboard activation; callers can explicitly disable it.

## Verify by hand

- Move between tabs with arrow keys and confirm focus automatically activates the corresponding panel.
