import type { User, SwipestatsTier } from "@/server/db/schema";

// Feature access by tier
export const TIER_FEATURES = {
  FREE: {
    maxDataUploads: 1,
    compareToFounder: true,
    basicInsights: true,
    demographicComparison: false,
    messageIntelligence: false,
    fullDirectoryAccess: false,
  },
  PLUS: {
    maxDataUploads: Infinity,
    compareToFounder: true,
    basicInsights: true,
    demographicComparison: true,
    messageIntelligence: false,
    fullDirectoryAccess: false,
  },
  ELITE: {
    maxDataUploads: Infinity,
    compareToFounder: true,
    basicInsights: true,
    demographicComparison: true,
    messageIntelligence: true,
    fullDirectoryAccess: true,
  },
} as const;

export type TierFeatures = typeof TIER_FEATURES;
export type FeatureKey = keyof TierFeatures["FREE"];

/**
 * Get effective tier considering subscription expiry
 * Returns FREE if subscription has expired, otherwise returns stored tier
 */
export function getEffectiveTier(user: User): SwipestatsTier {
  // Lifetime users never expire
  if (user.isLifetime) {
    return user.swipestatsTier;
  }

  // Check if subscription is still active
  if (
    user.subscriptionCurrentPeriodEnd &&
    user.subscriptionCurrentPeriodEnd > new Date()
  ) {
    return user.swipestatsTier;
  }

  // Expired or no subscription = FREE
  return "FREE";
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(user: User, feature: FeatureKey): boolean {
  const tier = getEffectiveTier(user);
  const featureValue = TIER_FEATURES[tier][feature];

  // Handle boolean features
  if (typeof featureValue === "boolean") {
    return featureValue;
  }

  // Handle numeric features (like maxDataUploads)
  return featureValue > 0;
}

/**
 * Check if user has an active paid subscription
 */
export function hasActiveSubscription(user: User): boolean {
  return getEffectiveTier(user) !== "FREE";
}

/**
 * Get feature limits for a user
 */
export function getFeatureLimits(user: User): TierFeatures[SwipestatsTier] {
  const tier = getEffectiveTier(user);
  return TIER_FEATURES[tier];
}
