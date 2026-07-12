# switch

2026-07-12, transformation engine, migrated switch state and thumb handling to Base UI.

## Changed

- `src/components/ui/switch.tsx:3` uses Base UI Switch and maps checked, unchecked, and disabled selectors.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/switch.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing controlled switch handlers retain their single-argument compatibility.

## Behavior changes

- The root renders Base UI's span-plus-hidden-input anatomy rather than a button.

## Verify by hand

- Toggle the switch with pointer and keyboard and confirm thumb travel and submitted values.
