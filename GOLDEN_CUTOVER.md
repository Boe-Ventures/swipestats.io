# Golden cutover — what moved, and what's left to clean up

This PR promoted the **golden** marketing redesign to production. The former
`/golden` preview is now the real home (`/`), and `/research` +
`/how-to-request-your-data` ship on the same design system.

This file tracks what was **superseded but intentionally left in place**, so a
follow-up PR can delete it safely without bloating the cutover diff. Nothing
listed under "Orphaned" is imported by any route anymore — they're dead weight,
not live code.

## What changed in the cutover

- `src/app/(marketing)/golden/page.tsx` → **moved to** `src/app/(marketing)/page.tsx`
  (the real home). `git mv` preserves history. The `/golden` route is gone.
- Removed the amber "preview only (noindex)" banner; restored real home
  `metadata` (title/description/canonical/openGraph) + the `organizationJsonLd`
  schema block from the old home.
- Relative imports rewritten `../` → `./` (the file moved up one level).
- `golden-dashboard` link `/golden` → `/`.

## Orphaned — safe to delete in the cleanup PR

These were only imported by the old home `page.tsx`, which was overwritten.
Verified: no remaining importers.

| File | Superseded by (in the new home) |
|------|--------------------------------|
| `src/app/(marketing)/HeroHeading.tsx` | golden `Hero` |
| `src/app/(marketing)/AboutSection.tsx` | golden `AboutImage` |
| `src/app/(marketing)/Testimonials.tsx` | golden `TestimonialsMasonry` |
| `src/app/(marketing)/FAQ.tsx` (shadcn Accordion) | golden `Faq` + `_components/FaqList` |
| `src/app/(marketing)/DatasetPricingSection.tsx` | golden `Research` section |
| `src/app/(marketing)/DataRequestSupport.tsx` | golden `DataRequestBand` |
| `src/app/(marketing)/ProfilePreviewsBanner.tsx` | (was already commented out) |

## Keep — still live, do NOT delete

- `src/app/(marketing)/BlogSection.tsx` — the new home's `Press` section imports
  `posts` from here. (The `Blog` component export is now unused and could be
  trimmed, but the file stays for `posts`.)
- `src/app/(marketing)/NewsletterCTA.tsx` — used by the home + insights +
  directory + blog + design-system.
- `src/app/(marketing)/InsightsShowcase.tsx` — used by home + research + insights.
- `src/app/(marketing)/MarketingCtaSection.tsx` — **not** home-orphaned: still
  imported by `/design-system` as a catalog example. Orphaned only if
  design-system is also removed.

## Preview / catalog routes still in the tree (noindex)

- `src/app/design-system/page.tsx` — component catalog. Keep as a living
  storybook, or delete if unwanted. Imports `MarketingCtaSection` + `NewsletterCTA`.
- `src/app/golden-dashboard/page.tsx` — preview of the golden **app** primitives
  (`Panel`, `AppPageHeader`, `StatTiles`, `GoldenAppHeader`, `Funnel`, etc. from
  `src/components/golden`). This is the reference spec for the app migration
  below; keep until the real app adopts those primitives, then remove.

## Future work — fork #2: migrate the real `/app` onto the design system

Out of scope for this PR. The golden **app** primitives in
`src/components/golden/` are currently used **only** by `golden-dashboard` and
`design-system` — 0% adoption in the real authenticated app. A follow-up should
migrate, in order of leverage:

1. App shell: `src/app/app/AppHeader.tsx` → `GoldenAppHeader` / `GoldenSidebar`.
2. Page headers: `h1+p` → `AppPageHeader` across `app/dashboard`, `app/account`,
   `app/profile-compare`.
3. Stat displays: `DashboardHero` hand-rolled grids → `StatTiles` / `HeroStats`.
4. Charts: wire the real `/insights/*` charts to `GOLDEN_CHART_COLORS`
   (defined but currently unused by the production charts).

See `.claude` memory `swipestats-golden-design-learnings` for the L1–L6
conventions (glow clipping, demo-frame shadow neutralizer, bg rhythm,
center-led alignment, primitives) to apply during that migration.
