# alert-dialog

2026-07-12, transformation engine, migrated the alert dialog to Base UI Backdrop, Popup, and Close semantics.

## Changed

- `src/components/ui/alert-dialog.tsx:4` maps Cancel and Action to styled Close parts so both retain dismissal behavior.
- The account-deletion trigger now uses `render`; its destructive mutation and loading state are unchanged.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/alert-dialog.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Destructive mutations and loading state logic are unchanged.

## Behavior changes

- Base UI focuses the first tabbable control by default rather than having a distinct Cancel primitive.

## Verify by hand

- Open each delete alert, verify initial focus, cancel, confirm, Escape, and focus return.
