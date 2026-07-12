# scroll-area

2026-07-12, transformation engine, migrated scrollbar and thumb part names to Base UI.

## Changed

- `src/components/ui/scroll-area.tsx:3` uses Base UI Root, Viewport, Scrollbar, Thumb, and Corner while preserving dimensions.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/scroll-area.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- The wrapper continues to provide a vertical scrollbar by default.

## Behavior changes

- Radix `type` and `scrollHideDelay` controls are not available; visibility is CSS and overflow driven.

## Verify by hand

- Scroll long content with mouse, trackpad, and keyboard and confirm thumb sizing and focus ring.
