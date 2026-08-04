# hover-card

2026-07-12, transformation engine, migrated Hover Card to Base UI Preview Card while retaining public wrapper names.

## Changed

- `src/components/ui/hover-card.tsx:3` maps Root and Trigger to PreviewCard and Content to Positioner plus Popup.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/hover-card.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- No application call sites required delay relocation.

## Behavior changes

- Base UI's trigger delay defaults differ from Radix when no explicit delay is provided.

## Verify by hand

- Hover and focus a preview trigger, move into the card, then leave and confirm open and close timing.
