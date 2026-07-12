# dialog

2026-07-12, transformation engine, migrated the custom responsive desktop dialog to Base UI while preserving its Vaul mobile bridge.

## Changed

- `src/components/ui/dialog.tsx:4` maps Overlay to Backdrop and Content to Popup with Base UI transition hooks.
- Responsive parts consume one root-owned desktop/mobile decision so hydration cannot mix a Base UI root with a Vaul trigger or content tree.
- Benchmark-detail and design-system triggers use `render`; `SimpleDialog` keeps SwipeStats' `subHeader`, footer, and bounded scrolling behavior.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/dialog.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- `src/components/ui/drawer.tsx` remains on Vaul by the hard no-touch rule; the mobile bridge internally uses Vaul's `asChild` API.

## Behavior changes

- Base UI open callbacks include event details, and its Portal adds a wrapper element.

## Verify by hand

- Open on desktop and mobile widths, tab through content, close by button, Escape, and backdrop, and confirm focus returns to the trigger.
