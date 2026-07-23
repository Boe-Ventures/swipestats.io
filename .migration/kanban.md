# kanban

2026-07-12, transformation engine, migrated five drag-aware Slot wrappers to Base UI useRender.

## Changed

- `src/components/ui/kanban.tsx:31` replaces Slot with `useRender` and `mergeProps` for boards, columns, handles, and items while retaining composed refs and drag listeners.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/kanban.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- DnD Kit primitives and collision behavior are unrelated and unchanged.

## Behavior changes

- Polymorphic Kanban callers use `render` instead of `asChild`.

## Verify by hand

- Drag columns and items by pointer and keyboard, including custom rendered elements, and confirm handles and disabled states.
