# collapsible

2026-07-12, transformation engine, migrated Collapsible Content to the Base UI Panel part.

## Changed

- `src/components/ui/collapsible.tsx:3` rewires Root, Trigger, and Panel without changing the public wrapper names.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/collapsible.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Sidebar-owned `data-state=collapsed` is application state, not a Radix hook, and remains unchanged.

## Behavior changes

## Verify by hand

- Expand and collapse sidebar sections with mouse and keyboard and confirm content visibility.
