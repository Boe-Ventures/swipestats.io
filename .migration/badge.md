# badge

2026-07-12, transformation engine, migrated the non-button Radix Slot idiom to Base UI useRender.

## Changed

- `src/components/ui/badge.tsx:3` replaces Slot/asChild with `useRender`, `mergeProps`, and the `render` prop while preserving variants.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/badge.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Badge colors and sizes are unchanged.

## Behavior changes

- Polymorphic callers use `render` instead of `asChild`.

## Verify by hand

- Render badges as spans and links and confirm styles, merged props, and link activation.
