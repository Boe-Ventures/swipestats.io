# SwipeStats migration baseline

## Verification and release contract

- `bun run build` is compile-only (`velite build && next build --webpack`). It
  does not run a database migration.
- Production database migrations are explicit through `bun run release:migrate`
  (which delegates to the existing `db:migrate` command).
- `bun run clean` preserves `bun.lock`; `bun run clean:lock` is the deliberate
  lock-refresh escape hatch.
- `.github/workflows/verify.yml` uses Bun 1.3.6, a frozen install, read-only
  repository permissions, and the standard `bun run check` gate.
- PostHog source-map upload is enabled only when
  `POSTHOG_PERSONAL_API_KEY` is present. Builds with placeholder environment
  values make no paid-provider call.
- Next 16.2's default Turbopack build rejects existing mixed client/server tRPC
  import boundaries. Webpack remains the production compiler until that
  architecture is separated in a dedicated change.

## Direct security updates

The live audit began at **132 findings**: 1 critical, 57 high, 61 moderate,
and 13 low. The compatible direct runtime baseline now resolves:

- Better Auth 1.6.23 (declared floor `^1.6.13`)
- Next.js 16.2.10 (declared floor `^16.2.6`)
- Drizzle ORM 0.45.2
- `ws` 8.21.0
- PostCSS 8.5.17

After these changes, the audit reports **119 findings**: 0 critical, 47 high,
60 moderate, and 12 low. The direct Better Auth and Drizzle advisory groups are
cleared. The remaining report is transitive or a second nested copy, including
old Next/PostCSS versions under development tooling, `ws` under optional
database/email packages, DOMPurify under Cal.com/PostHog, Axios under
Firecrawl/PostHog tooling, and mail/render/build-tool dependencies. These are
not force-overridden because doing so would risk incompatible third-party
graphs; they should be retired by normal upstream releases or removal of the
owning feature.

## Known baseline debt

The full repository Prettier check predates this phase and remains red on 91
out-of-scope files. Changed files are formatted and the CI gate intentionally
uses lint, TypeScript, and Bun tests until formatting debt is addressed
separately.

## Base UI whole-project migration

- Added `@base-ui/react@1.6.0` and removed all 23 direct
  `@radix-ui/react-*` dependencies only after the source-import count reached
  zero. Also removed the unused direct `@calcom/atoms` dependency after its
  pinned Radix Slot version conflicted with intentionally retained composite
  libraries; the post-migration audit reports 102 transitive vulnerabilities.
- Migrated 28 wrapper/utility files and their application consumers using the
  transformation engine, with Jetpack's reviewed final wrappers as golden
  references. SwipeStats-specific Button sizes/loading, SimpleDialog layout,
  typed SimpleSelect, form accessibility, theme storage, and responsive Vaul
  bridges were replayed rather than overwritten.
- Converted supported `asChild` consumers to `render`, accordion and
  ToggleGroup values to arrays, Select handlers to nullable-safe callbacks,
  and Radix state/CSS hooks to Base UI presence attributes and variables.
- Tabs explicitly retain automatic activation through `activateOnFocus`.
  Dropdown checkbox/radio/link items and navigation links explicitly retain
  close-on-click behavior. Navigation Menu retains the previous 200ms open
  delay. Dropdown labels are nested inside their owning groups so Base UI can
  establish the automatic hydrated `aria-labelledby` relationship.
- Intentionally untouched composites: cmdk/command, Vaul/drawer,
  Sonner/toast, input-otp, React Day Picker/calendar, and Recharts/chart. The
  remaining `asChild` and open/closed `data-state` selectors are Vaul-owned.
  Table row `data-state=selected` is application-owned selection state.
- Direct Radix source imports: 0. Direct Radix dependencies: 0. Supported
  wrappers remaining on direct Radix: 0. Any Radix packages in the lockfile
  are transitive through intentionally untouched libraries.

### Base UI verification

- `src/components/ui/base-ui-contract.test.tsx` characterizes Button render
  composition, checkbox hidden-input anatomy, accordion array values, tab
  relationships, and server-rendered dropdown group ownership.
- `bun run check` passes with 0 errors (25 pre-existing warnings), all 16 Bun
  tests pass with 60 assertions, `bun install --frozen-lockfile` is clean, and
  the side-effect-free webpack production build completes all 305 static pages.
- Keyboard, focus-return, collision, hover-delay, and screen-reader behavior
  still require the per-component manual checks listed in `.migration/*.md`;
  no browser or assistive-technology verification is claimed here.
