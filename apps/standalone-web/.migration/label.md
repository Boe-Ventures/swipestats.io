# label

2026-07-12, transformation engine, replaced the Radix Label primitive with the native label element while preserving classes.

## Changed

- `src/components/ui/label.tsx:6` now renders `<label>` with the existing selection and disabled-state styling.
- `src/components/ui/form.tsx` now types form labels against the native element.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/label.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- React Hook Form behavior remains unchanged for the later Formisch migration.

## Behavior changes

## Verify by hand

- Click labels for text, checkbox, and radio inputs and confirm their controls receive focus or toggle.
