# avatar

2026-07-12, transformation engine, migrated the avatar root, image, and fallback to Base UI.

## Changed

- `src/components/ui/avatar.tsx:3` rewires all parts to `@base-ui/react/avatar` and preserves the existing sizing and fallback classes.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/avatar.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- User dropdown content and image fallback text were not otherwise redesigned.

## Behavior changes

## Verify by hand

- Load a valid avatar and a broken or absent image and confirm the fallback appears correctly.
