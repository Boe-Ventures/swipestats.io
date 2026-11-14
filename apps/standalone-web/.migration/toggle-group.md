# toggle-group

2026-07-12, transformation engine, migrated the group to Base UI and items to the shared Toggle primitive.

## Changed

- `src/components/ui/toggle-group.tsx:5` uses Base UI ToggleGroup and Toggle while preserving context-driven variants and spacing.
- `src/components/ui/form-inputs/PresetNumberField.tsx` converts the single scalar value to Base UI's always-array contract and maps pressed classes.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/toggle-group.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Preset selection still stores a scalar in the surrounding form state.

## Behavior changes

- Group values are always arrays and roving focus can no longer be disabled.

## Verify by hand

- Select, clear, and keyboard-navigate preset number buttons; confirm exactly one value is reflected in the form.
