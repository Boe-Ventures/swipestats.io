# toggle

2026-07-12, transformation engine, migrated the single-part toggle to Base UI and preserved variants.

## Changed

- `src/components/ui/toggle.tsx:4` uses the callable Base UI Toggle and maps `data-state=on` styling to `data-pressed`.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/toggle.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Variant and size names remain unchanged.

## Behavior changes

## Verify by hand

- Press each toggle variant with mouse and keyboard and confirm pressed styling and focus.
