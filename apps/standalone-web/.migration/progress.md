# progress

2026-07-12, transformation engine, migrated progress to Base UI's Root, Track, and computed Indicator anatomy.

## Changed

- `src/components/ui/progress.tsx:3` adds Track and removes manual translate percentage math.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/progress.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing height, color, and transition classes are preserved.

## Behavior changes

- Base UI computes the indicator width and reports progressing, complete, or indeterminate state with presence attributes.

## Verify by hand

- Render 0%, partial, 100%, and indeterminate values and inspect visual fill and ARIA values.
