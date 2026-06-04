/**
 * Brand symbol icons for dating providers, as inline SVGs using `currentColor`
 * so they recolor to fit the provider chip (white-on-brand by default).
 *
 * Add new marks here from each brand's official "Symbol" SVG (single-color
 * variant), then point the provider's `icon` in provider-config.ts at it.
 */

interface BrandIconProps {
  className?: string;
}

/** Tinder flame — official symbol path. */
export function TinderIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 35 40.3"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10.5 16.25c-.06 0-.1 0-.14-.04-1.36-1.8-1.7-4.9-1.78-6.08-.02-.23-.28-.35-.48-.24C3.9 12.24 0 17.82 0 23.2c0 9.27 6.43 17.04 17.5 17.04 10.37 0 17.5-8 17.5-17.03C35 11.4 26.57 3.58 19.06.04c-.2-.1-.42.07-.4.28.98 6.37-.36 13.28-8.17 15.95z" />
    </svg>
  );
}

/**
 * Raya — two interlocking rings. Rebuilt as vector geometry (the official
 * asset is a raster PNG of symbol-over-wordmark). Uses `currentColor` for the
 * stroke so it reads as white rings on the black Raya chip.
 */
export function RayaIcon({ className }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 42 28"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="13.5" cy="14" r="12" />
      <circle cx="28.5" cy="14" r="12" />
    </svg>
  );
}
