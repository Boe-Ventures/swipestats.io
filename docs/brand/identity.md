# SwipeStats identity

Human Data, adopted October 2, 2026.

The editable creative brief and reference artwork live in [Bifrost](https://bifrost-lime-beta.vercel.app/app/brands/swipestats/setup). Use its writing and visual guidance for new content. Saved social compositions live in the brand's [composition library](https://bifrost-lime-beta.vercel.app/app/brands/swipestats/compositions).

This repository owns the exact runtime assets:

- `src/lib/brand.ts` defines the five-bar heart geometry and palette.
- `SwipeStatsMark` renders the shared inline mark across marketing, app navigation, and loading states.
- `public/images/brand/` contains SVG and PNG exports in rose, ink, and white, plus the app tile.
- `src/app/icon.png`, `public/favicon.ico`, and the existing public logo URL are generated from that geometry.

Run `bun scripts/generate-brand-assets.ts` after editing the geometry. Commit the generated assets with the source.

Inter and Geist Mono remain the site's fonts. Brand rose is #E64368. The darker action rose #C82E54 supports readable white button labels. Paper #FAF8F5, Ink #202126, Lilac #DAD5EC, and Sage #AABBAA are available as brand tokens. Chart series colors remain separate from the identity palette.

Use the brand's own heart for SwipeStats. Provider logos continue to identify the actual dating apps in datasets and integrations.
