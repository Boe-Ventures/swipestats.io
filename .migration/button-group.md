# button-group

2026-07-12, transformation engine, migrated ButtonGroupText's Slot composition to Base UI useRender.

## Changed

- `src/components/ui/button-group.tsx:2` uses `useRender` and `mergeProps` for polymorphism while preserving layout classes.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/button-group.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Group orientation and button styling remain unchanged.

## Behavior changes

- Polymorphic callers use `render` instead of `asChild`.

## Verify by hand

- Render horizontal and vertical groups with text and buttons and inspect borders and focus order.
