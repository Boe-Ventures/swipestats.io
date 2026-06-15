// =====================================================
// CONSENT CORE — portable, platform-neutral
// =====================================================
//
// Types + pure helpers for granular cookie/tracking consent. No React, no
// `window`, no storage — so it imports cleanly on both client and server, and
// is copy-paste portable to other projects (the only thing that differs per
// project is the `ConsentPolicy`).
//
// Categories follow the standard CMP taxonomy (OneTrust / Cookiebot / IAB):
//   - essential   : always on, cannot be disabled
//   - functional  : remembered preferences (non-tracking)
//   - analytics   : product analytics + session replay (PostHog, Amplitude, Vercel)
//   - advertising : third-party / cross-site / data-sharing pixels (none today)
// =====================================================

export const CONSENT_CATEGORIES = [
  "essential",
  "functional",
  "analytics",
  "advertising",
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentPreferences = Record<ConsentCategory, boolean>;

/**
 * Bump when categories (or what they cover) change — a stored decision with an
 * older version is treated as stale and the banner is shown again.
 */
export const CONSENT_VERSION = 1;

export interface ConsentRecord {
  preferences: ConsentPreferences;
  version: number;
  decidedAt: string; // ISO-8601
}

/** EU/strict default — only essential on. */
export const ALL_OFF: ConsentPreferences = {
  essential: true,
  functional: false,
  analytics: false,
  advertising: false,
};

/** Everything on (used by Accept-All and the CCPA/opt-out default). */
export const ALL_ON: ConsentPreferences = {
  essential: true,
  functional: true,
  analytics: true,
  advertising: true,
};

/** Force `essential` true and default any missing category to false. */
export function normalizeConsent(
  partial?: Partial<ConsentPreferences> | null,
): ConsentPreferences {
  return {
    essential: true,
    functional: partial?.functional ?? false,
    analytics: partial?.analytics ?? false,
    advertising: partial?.advertising ?? false,
  };
}

/** Is a given category allowed under these preferences? Essential is always allowed. */
export function isAllowed(
  preferences: ConsentPreferences | null | undefined,
  category: ConsentCategory,
): boolean {
  if (category === "essential") return true;
  return preferences?.[category] === true;
}

// =====================================================
// POLICY — how INITIAL (pre-decision) defaults are resolved
// =====================================================
//
// SwipeStats uses STRICT_POLICY (GDPR opt-in everywhere). A geo-aware policy
// (e.g. CCPA opt-out outside the EU) is a drop-in replacement for another
// project — it would read Vercel's geo headers and return ALL_ON outside the
// EU. The rest of the system never changes.

export interface GeoHint {
  country?: string; // ISO-3166 alpha-2, e.g. "US"
  region?: string; // e.g. "CA"
}

export interface ConsentPolicy {
  resolveDefaults: (geo?: GeoHint) => ConsentPreferences;
}

/** GDPR-strict everywhere: nothing non-essential until the user opts in. */
export const STRICT_POLICY: ConsentPolicy = {
  resolveDefaults: () => ALL_OFF,
};

// =====================================================
// UI METADATA
// =====================================================

export interface ConsentCategoryMeta {
  key: ConsentCategory;
  label: string;
  description: string;
  /** Cannot be toggled off in the UI. */
  locked?: boolean;
}

export const CONSENT_CATEGORY_META: ConsentCategoryMeta[] = [
  {
    key: "essential",
    label: "Essential",
    description:
      "Required for the site to work — sign-in, security, and remembering your cookie choice. These can't be turned off.",
    locked: true,
  },
  {
    key: "functional",
    label: "Functional",
    description:
      "Remembers preferences to improve your experience (e.g. pre-filling a form you already submitted). No cross-site tracking.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Helps us understand how the product is used so we can improve it — anonymous usage events and session replays (PostHog, Amplitude, Vercel). Inputs are masked in replays.",
  },
  {
    key: "advertising",
    label: "Advertising",
    description:
      "Third-party advertising and marketing pixels that may share data across sites. SwipeStats runs none of these today; the control is here for transparency.",
  },
];
