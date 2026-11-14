# dropdown-menu

2026-07-12, transformation engine, migrated Dropdown Menu to Base UI Menu and its positioned popup anatomy.

## Changed

- `src/components/ui/dropdown-menu.tsx:4` maps labels, indicators, submenus, and popup positioning; link entries use `Menu.LinkItem`.
- User, event, photo-library, feedback, and design-system consumers use render triggers; user navigation uses Base link items.
- Every `DropdownMenuLabel` now lives inside the `DropdownMenuGroup` containing the items it labels, preserving Base UI's hydrated `aria-labelledby` relationship.
- `grep -n "radix-ui\|@radix-ui" src/components/ui/dropdown-menu.tsx` is clean.
- Automated verification: covered by `bun run check`, focused Base UI contract tests (including server-rendered group ownership), and the compile-only production build.

## Left alone

- `cmdk` command menus remain intentionally untouched.

## Behavior changes

- The wrapper explicitly sets Radix-parity `closeOnClick` behavior for checkbox, radio, and link items.
- Base UI establishes each group's `aria-labelledby` link after hydration; server output already preserves the required group/label/item ownership and stable label ID.

## Verify by hand

- Open user and theme menus, keyboard-navigate and typeahead, activate links, and test any checkbox, radio, and submenu entries.
