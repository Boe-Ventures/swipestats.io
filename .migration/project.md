# SwipeStats Base UI migration

Updated on 2026-07-23 by rebasing the existing migration onto current
`origin/main` (`5c0851b1` at reconciliation time).

## Scope

- Added `@base-ui/react@^1.6.0` and removed all 23 direct
  `@radix-ui/react-*` dependencies after the source-import count reached zero.
- Migrated 28 supported UI wrappers/utilities and their application consumers
  from Radix composition to Base UI.
- Converted supported `asChild` consumers to `render`, accordion and
  ToggleGroup values to arrays, Select handlers to nullable-safe callbacks,
  and Radix state/CSS hooks to Base UI presence attributes and variables.
- Preserved SwipeStats-specific Button sizes/loading, SimpleDialog layout,
  typed SimpleSelect, form accessibility, theme storage, and responsive Vaul
  bridges.
- Kept React Hook Form and Zod. Formisch, Valibot, TanStack Form, and oRPC are
  intentionally outside this migration.

## Cross-project reconciliation

Homi's merged Base UI migration (`eeaf6c23`) and its follow-up menu-group fix
(`c2168a41`) were used as behavior references alongside Jetpack's reviewed
wrappers.

SwipeStats already contained the important follow-up lessons:

- Dropdown labels are nested inside their owning groups.
- Polymorphic Button renders infer non-native semantics.
- Nullable Base UI Select values are guarded at state boundaries.
- Responsive Dialog parts consume one root-owned desktop/mobile decision.
- Tabs retain automatic activation, dropdown and navigation items retain
  close-on-click behavior, and Navigation Menu retains the previous hover
  delay.
- Contract tests cover Button composition, checkbox anatomy, accordion values,
  tab relationships, and dropdown group ownership.

The 2026-07-23 rebase also migrated newer `main` consumers that did not exist
when the branch was first created: Claude Design previews, dating-services and
Raya links, catalog dialogs, and inquiry dialogs.

## Intentionally untouched composites

- Vaul drawer
- cmdk/command
- Sonner/toast
- input-otp
- React Day Picker/calendar
- Recharts/chart

The four remaining `asChild` occurrences are all Vaul drawer triggers:

- `.design-sync/previews/Drawer.tsx`
- `src/app/design-system/page.tsx`
- `src/components/ui/compound/combobox.tsx`
- `src/components/ui/dialog.tsx`

`src/components/ui/table.tsx` retains application-owned
`data-state="selected"` styling. Vaul retains its own open/closed state
selectors.

## Derived status

- Direct Radix source imports: 0.
- Direct Radix dependencies: 0.
- Supported wrappers remaining on direct Radix: 0.
- Database schema or migration changes: 0.
- Authentication, billing, and analytics contract changes: 0.

Any Radix packages remaining in `bun.lock` are transitive through intentionally
untouched composite libraries.

## Verification contract

Before publishing:

- `bun install --frozen-lockfile`
- `bun run check`
- production build without applying a database migration
- desktop and mobile `/design-system` interaction smoke
- authenticated account and upload-route smoke

Collision, hover-delay, exhaustive cross-browser behavior, mutation-backed
flows, screen-reader announcements, and assistive-technology behavior remain
explicit manual QA rather than implied coverage.
