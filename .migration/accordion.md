# accordion

2026-07-12, transformation engine, migrated accordion parts and height animation to Base UI.

## Changed

- `src/components/ui/accordion.tsx:3` maps Content to Panel, trigger state to `data-panel-open`, and height to `--accordion-panel-height`.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/accordion.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- No application accordion consumers required scalar-to-array changes.

## Behavior changes

- Values are arrays in both single and multiple mode, and single mode is always collapsible.

## Verify by hand

- Open and close panels with pointer and keyboard and confirm the chevron and height transition.
