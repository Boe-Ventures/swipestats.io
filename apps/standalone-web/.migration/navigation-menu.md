# navigation-menu

2026-07-12, transformation engine, migrated the shared navigation popup to Base UI Positioner, Popup, and Viewport.

## Changed

- `src/components/ui/navigation-menu.tsx:2` replaces the Radix viewport model, maps Indicator to Icon, and rewrites popup size variables.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/navigation-menu.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- There are no current application consumers of this wrapper.

## Behavior changes

- The old `viewport` boolean is removed and the popup is anchor-positioned; the wrapper explicitly preserves the previous 200ms open delay and link-close behavior.

## Verify by hand

- Render a navigation menu fixture and test hover delay, keyboard navigation, content transitions, links, and viewport edge collision.
