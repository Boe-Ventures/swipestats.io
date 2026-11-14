# separator

2026-07-12, transformation engine, migrated the separator wrapper to Base UI with its existing dimensions and colors.

## Changed

- `src/components/ui/separator.tsx:3` uses the callable Base UI Separator and drops Radix's `decorative` prop.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/separator.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Existing consumers did not pass `decorative`, so no call-site changes were needed.

## Behavior changes

- Base UI separators are semantic by default rather than decorative by default.

## Verify by hand

- Inspect horizontal and vertical separators and confirm dimensions and screen-reader semantics.
