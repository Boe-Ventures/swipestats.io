# radio-group

2026-07-12, transformation engine, migrated the group and radio item namespaces to Base UI.

## Changed

- `src/components/ui/radio-group.tsx:3` uses `RadioGroup` for the group and `Radio.Root`/`Radio.Indicator` for items.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/radio-group.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests, and the compile-only production build.

## Left alone

- Card-style radio consumers keep their current layout and form ownership.

## Behavior changes

- Radio roots use Base UI's span and hidden-input anatomy; orientation and loop props are no longer exposed.

## Verify by hand

- Arrow through a radio group, select a value, and confirm disabled items and form submission.
