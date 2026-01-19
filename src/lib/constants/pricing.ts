/**
 * SwipeStats pricing configuration
 * Used for display purposes in UI components
 */
export const SWIPESTATS_PRICING = {
  PLUS: {
    monthly: 9,
    lifetime: 99,
    lifetimeLaunchPrice: 50, // Limited time launch offer
  },
  ELITE: {
    monthly: 29,
    lifetime: 299,
    lifetimeLaunchPrice: 100, // Limited time launch offer
  },
} as const;

/**
 * Features included in each tier
 * Used for displaying feature comparisons
 */
export const TIER_FEATURES = {
  PLUS: [
    "All demographic comparisons",
    "Advanced percentile rankings",
    "The Swipe Guide",
  ],
  PLUS_COMING_SOON: [
    "Message Intelligence AI",
    "AI Profile Review & Roast",
    "Geographic Directory Search for profile comparisons (7,000+ profiles)",
  ],
  ELITE: [
    "Everything in Plus",
    "Message Intelligence AI",
    "AI-powered conversation starters",
    "Profile optimization tips",
    "Full directory access",
    "Priority support",
    "Early access to new features",
    "Advanced export options",
  ],
} as const;

export type SwipestatsTier = "PLUS" | "ELITE";
export type BillingPeriod = "monthly" | "lifetime";
