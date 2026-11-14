# tooltip

2026-07-12, transformation engine, migrated tooltip delay, positioning, popup, and arrow anatomy to Base UI.

## Changed

- `src/components/ui/tooltip.tsx:3` maps Provider `delayDuration` to `delay` and forwards side/alignment to Positioner.
- Directory cards, chart info helpers, and the design system use render triggers; the explicit info-tooltip delay uses the renamed provider prop.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/tooltip.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing zero-delay wrapper behavior is retained.

## Behavior changes

- The tooltip arrow uses Base UI's positioned div anatomy and the default side offset is now 4px.

## Verify by hand

- Hover and keyboard-focus sidebar controls on each side and inspect delay, arrow placement, and dismissal.
