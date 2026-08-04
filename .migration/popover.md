# popover

2026-07-12, transformation engine, migrated popovers to the Base UI Portal, Positioner, and Popup model.

## Changed

- `src/components/ui/popover.tsx:4` forwards align and side props to Positioner and maps transform origin.
- Combobox and date-picker consumers now use `render` triggers.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/popover.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- `PopoverAnchor` remains an inert span compatibility export because Base UI has no equivalent part and there are no consumers.

## Behavior changes

- Portal adds a wrapper element and collision padding follows Base UI defaults.

## Verify by hand

- Open date pickers and comboboxes near viewport edges; confirm alignment, dismissal, keyboard focus, and focus return.
