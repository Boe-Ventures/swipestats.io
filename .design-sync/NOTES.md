# design-sync notes — swipestats → "SwipeStats Design System" (claude.ai/design)

Project: `2f51543a-fe27-4a46-a403-ab46e6acc79d` (see config.json). Stage the
gitignored `.ds-sync/` from the design-sync skill's base dir (canonical
`cp -r` line in its §2.7), then `npm i esbuild ts-morph @types/react
playwright` inside it.

## Repo-specific setup

- **No workspace package** — the kit lives in the app at
  `src/components/ui/`. `cfg.pkg` is the app itself (`swipestats`, repo-root
  package.json); the committed barrel `src/components/ui/.ds-entry.ts` is the
  `--entry`. Regenerate the barrel when components are added.
- **Excluded as legacy** (name collisions with the live modules):
  `tan-form.tsx` (superseded by `form-new.tsx` — 28 app consumers vs 0) and
  top-level `country-select.tsx` (superseded by
  `form-inputs/CountrySelect.tsx`). Also excluded:
  `upload/ImageUploadDialog.tsx` (no named component export).
- Bun repo (`bun install`), flat node_modules → `--node-modules
  ./node_modules` (react + react-dom both at root).
- Build/validate (repo root):
  1. `cfg.buildCmd` — `bunx @tailwindcss/cli@4.1.18 -i
     src/components/ui/styles/globals.css -o .ds-dist/globals.css && cat
     src/components/ui/.ds-font-tokens.css >> .ds-dist/globals.css`
     (ALWAYS before the converter; `.ds-dist/` is gitignored; pin the CLI to
     the repo's installed tailwindcss version)
  2. `node .ds-sync/package-build.mjs --config .design-sync/config.json
     --node-modules ./node_modules --entry src/components/ui/.ds-entry.ts
     --out ./ds-bundle`
  3. `node .ds-sync/package-validate.mjs ./ds-bundle`
- `.ds-tsconfig.json` maps `next/image` → `.ds-next-image.ts` (CJS-interop
  shim, copied from homi) and `@/*` → `./src/*` (ImageUpload imports
  `@/lib/format` + `@/lib/blob-paths`). `.ds-shim.ts` provides the `process`
  global for bundled next/link/next/image.
- Fonts: Inter + Geist Mono woff2 in `.design-sync/fonts/` (Google Fonts,
  OFL; Inter fetched 2026-07-19, Geist Mono shared from homi's sync).
  `src/components/ui/.ds-font-tokens.css` maps `--font-inter` /
  `--font-geist-mono` (the app sets those via next/font on `<html>`).
- `guidelinesGlob: []` — the default glob swept in unrelated WIP docs from
  `docs/` (blog handoffs, directory research). Nothing in the repo is a
  design-guideline doc today; revisit if one is written.
- Preview source of truth: `src/app/design-system/page.tsx` (13 sections of
  curated demos with real copy) + `Demos.tsx` + `form-new.example.tsx`.

## Known render warns (triaged legitimate)

- `[TOKENS_MISSING] --radix-*-height/width, --tw` — Radix runtime-set vars +
  tw-animate internal; non-blocking.
- `[FONT_MISSING] "Cambria"` — mid-stack member of the default
  `--font-serif` system stack (`ui-serif, Georgia, Cambria, …`); not a brand
  font, nothing to ship.

## Preview authoring gotchas

- APIs deviate from stock shadcn — read the source first. Known:
  `TypographyList` takes `items: [{text}]` (children ignored, joke default
  content); `Banner` has GeneriCon demo defaults; Alert ships semantic
  helpers (`InfoAlert` …); `SimpleSelect`/`SimpleDialog` convenience
  wrappers; Button has `loading` + `ButtonLink` sibling.
- Radix (not Base UI): `asChild`, static-open via `open`/`defaultOpen`,
  `TooltipProvider` required for Tooltip.
- Tailwind is frozen between full builds; preview classes must already exist
  in the compiled CSS — port classes from `page.tsx` demos or use inline
  styles.

- Preview class check: `grep -F '.class-name' .ds-dist/globals.css` before
  using a utility (escape dots: `mt-1\.5`). Classes from page.tsx are safe.
- Select previews: closed trigger + `defaultValue` renders reliably; don't
  fight static-open `SelectContent`. Label's disabled dim needs a
  `group`+`data-disabled="true"` wrapper. ToggleGroup inherits `variant`
  from the group via context.
- **Harness transform vs non-portaled fixed components**: `.ds-single`/
  `.ds-cell` carry `transform: translateZ(0)`, which becomes the containing
  block for `position: fixed`. Radix overlays escape via portal; **sonner's
  Toaster does not** — wrap it in a sized in-flow div
  (`style={{height: 360, position: "relative"}}`). Applies to any
  non-portaled fixed/sticky component.
- Dialog's responsive `useMediaQuery` swap: the 800x560 viewport override is
  what keeps it capturing as a desktop dialog, not a drawer.

## Re-sync risks

- `src/components/ui/.ds-entry.ts` is a snapshot — new component files enter
  the bundle only when the barrel AND `componentSrcMap` gain entries.
- `buildCmd` pins `@tailwindcss/cli@4.1.18` — bump with the repo.
- The tan-form/country-select exclusions assume form-new stays the live
  system; if the app migrates back, revisit the barrel.
- Inter/Geist Mono woff2s are committed; refetch only if the app's next/font
  families change.
- The `/design-system` page is the preview source — as it evolves, previews
  can be refreshed from it on any re-sync.
