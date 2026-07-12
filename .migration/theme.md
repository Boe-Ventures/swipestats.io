# theme

2026-07-12, transformation engine, removed the direct Radix icon dependency while preserving SwipeStats theme storage and menu behavior.

## Changed

- `src/components/ui/theme.tsx` replaces Radix theme icons with Lucide icons and uses the Base dropdown trigger contract.
- SwipeStats' `swipestats-theme` storage key and localStorage fallback remain unchanged.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/theme.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Theme resolution, production visibility, and storage behavior are product logic rather than primitive behavior and were preserved.

## Behavior changes

Empty; icon semantics and theme selection remain equivalent.

## Verify by hand

- In development, switch among light, dark, and system modes, reload, and confirm the saved mode and menu focus behavior.
