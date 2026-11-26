# sheet

2026-07-12, transformation engine, migrated the Dialog-based sheet wrapper to Base UI.

## Changed

- `src/components/ui/sheet.tsx:4` maps Overlay to Backdrop and Content to Popup while preserving all four side layouts with starting and ending transforms.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/sheet.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- The unrelated Vaul drawer wrapper remains untouched.

## Behavior changes

- Enter and exit animations now use Base UI transition presence hooks rather than Radix keyframe state hooks.

## Verify by hand

- Open sheets from every side, test Escape and close-button dismissal, and confirm focus return.
