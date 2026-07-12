# select

2026-07-12, transformation engine, migrated Select to Base UI's Positioner, Popup, List, group-label, and scroll-arrow anatomy.

## Changed

- `src/components/ui/select.tsx:4` rewires parts, maps `position=popper` behavior to `alignItemWithTrigger={false}`, and uses Base UI item indicators.
- Chart, geography-review, comparison, form-field, and SimpleSelect consumers use nullable-safe callbacks and label metadata.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/select.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing values and visible labels remain unchanged.

## Behavior changes

- `onValueChange` can receive null and item alignment is controlled by a boolean; Base UI adds a Portal wrapper element.

## Verify by hand

- Open every select, use arrows and typeahead, select values whose labels differ, and confirm focus return.
