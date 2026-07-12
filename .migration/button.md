# button

2026-07-12, transformation engine, migrated to the real Base UI Button primitive with the existing variants and loading behavior preserved.

## Changed

- `src/components/ui/button.tsx:4` replaces Radix Slot/asChild with `@base-ui/react/button` and the `render` API.
- Golden-shell and design-system link consumers now use `render`; SwipeStats' `xs`, `icon-xs`, Spinner, and `ButtonLink` contracts are preserved.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/button.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- `ButtonLink` remains a dedicated Next.js link convenience component.

## Behavior changes

- Polymorphic callers use `render` instead of `asChild`.

## Verify by hand

- Click normal, loading, disabled, and link-styled buttons; confirm focus rings and link navigation.
