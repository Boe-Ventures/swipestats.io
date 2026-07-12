# checkbox

2026-07-12, transformation engine, migrated checkbox state and indicator handling to Base UI.

## Changed

- `src/components/ui/checkbox.tsx:3` uses Base UI Checkbox and rewrites checked and disabled selectors to presence attributes.
- `src/components/ui/tan-form.tsx` updates parent `has-*` styling to `data-checked`.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/checkbox.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Form state ownership remains with the existing form layer pending Formisch.

## Behavior changes

- The root renders Base UI's span-plus-hidden-input anatomy instead of Radix's button anatomy.

## Verify by hand

- Toggle enabled, disabled, checked, and indeterminate checkboxes and submit them in a form.
