import {
  lemonSqueezySetup,
  createCheckout,
  getCustomer,
  validateLicense,
  getSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import crypto from "crypto";

import { env } from "@/env";
import { envSelect } from "@/lib/utils/env.utils";

// Initialize SDK on module load
lemonSqueezySetup({ apiKey: env.LEMON_SQUEEZY_API_KEY });

// Lemon Squeezy configuration - environment-aware
const LEMON_SQUEEZY_CONFIG = {
  storeId: envSelect({
    test: "97795", // Test mode store ID
    prod: "97795", // Production store ID (update when you have prod store)
  }),
  variants: {
    PLUS: {
      monthly: envSelect({
        test: "624661", // Test variant ID for PLUS monthly
        prod: "TBD", // Prod variant ID for PLUS monthly
      }),
      yearly: envSelect({
        test: "TBD", // Test variant ID for PLUS yearly
        prod: "TBD", // Prod variant ID for PLUS yearly
      }),
      lifetime: envSelect({
        test: "433959", // Test variant ID for PLUS lifetime
        prod: "TBD", // Prod variant ID for PLUS lifetime
      }),
    },
    ELITE: {
      monthly: envSelect({
        test: "TBD", // Test variant ID for ELITE monthly
        prod: "TBD", // Prod variant ID for ELITE monthly
      }),
      yearly: envSelect({
        test: "TBD", // Test variant ID for ELITE yearly
        prod: "TBD", // Prod variant ID for ELITE yearly
      }),
      lifetime: envSelect({
        test: "TBD", // Test variant ID for ELITE lifetime
        prod: "TBD", // Prod variant ID for ELITE lifetime
      }),
    },
  },
  datasetVariants: {
    STARTER: envSelect({
      test: "TBD", // Test variant ID for STARTER dataset
      prod: "TBD", // Prod variant ID for STARTER dataset
    }),
    STANDARD: envSelect({
      test: "TBD", // Test variant ID for STANDARD dataset
      prod: "TBD", // Prod variant ID for STANDARD dataset
    }),
    FRESH: envSelect({
      test: "TBD", // Test variant ID for FRESH dataset
      prod: "TBD", // Prod variant ID for FRESH dataset
    }),
    PREMIUM: envSelect({
      test: "TBD", // Test variant ID for PREMIUM dataset
      prod: "TBD", // Prod variant ID for PREMIUM dataset
    }),
  },
} as const;

// Product pricing configuration (in cents)
export const SWIPESTATS_PRODUCTS = {
  PLUS: {
    monthly: { price: 900 }, // $9/mo
    yearly: { price: 5900 }, // $59/yr
    lifetime: { price: 9900 }, // $99
  },
  ELITE: {
    monthly: { price: 2900 }, // $29/mo
    yearly: { price: 18900 }, // $189/yr
    lifetime: { price: 29900 }, // $299
  },
} as const;

// Dataset product configuration
export const DATASET_PRODUCTS = {
  STARTER: { price: 1500, profileCount: 10, recency: "MIXED" as const },
  STANDARD: { price: 5000, profileCount: 1000, recency: "MIXED" as const },
  FRESH: { price: 15000, profileCount: 1000, recency: "RECENT" as const },
  PREMIUM: { price: 30000, profileCount: 3000, recency: "RECENT" as const },
} as const;

export type SwipestatsTier = "PLUS" | "ELITE";
export type BillingPeriod = "monthly" | "yearly" | "lifetime";
export type DatasetTier = keyof typeof DATASET_PRODUCTS;

/**
 * Get tier and billing period from variant ID
 * Used by webhook handler to identify purchases
 */
export function getTierFromVariantId(
  variantId: string | number | undefined,
): { tier: SwipestatsTier; billingPeriod: BillingPeriod } | null {
  if (!variantId) return null;
  const variantIdStr = String(variantId);

  // Check all tiers and billing periods
  for (const tier of ["PLUS", "ELITE"] as const) {
    for (const period of ["monthly", "yearly", "lifetime"] as const) {
      if (LEMON_SQUEEZY_CONFIG.variants[tier][period] === variantIdStr) {
        return { tier, billingPeriod: period };
      }
    }
  }

  return null;
}

// Creates checkout URL for upgrade
export async function createUpgradeCheckout(
  userId: string,
  email: string | undefined,
  tier: SwipestatsTier,
  billingPeriod: BillingPeriod,
): Promise<string> {
  const variantId = LEMON_SQUEEZY_CONFIG.variants[tier][billingPeriod];

  // Validate variant ID is configured
  if (!variantId || variantId === "TBD") {
    throw new Error(
      `Variant ID for ${tier} ${billingPeriod} is not configured. Please set the variant ID in lemonSqueezy.service.ts`,
    );
  }

  const { data, error } = await createCheckout(
    LEMON_SQUEEZY_CONFIG.storeId,
    variantId,
    {
      checkoutData: {
        email,
        custom: { user_id: userId }, // Passed to webhooks
      },
      productOptions: {
        redirectUrl: `${env.NEXT_PUBLIC_BASE_URL}/app/dashboard?upgraded=true`,
      },
    },
  );

  if (error) {
    throw new Error(
      `Failed to create checkout: ${error.message}. Check that variant ID ${variantId} exists in your LemonSqueezy store.`,
    );
  }

  if (!data?.data?.attributes?.url) {
    throw new Error("Checkout URL not returned from LemonSqueezy");
  }

  return data.data.attributes.url;
}

// Get customer portal URL for managing subscription
export async function getCustomerPortalUrl(
  customerId: string,
): Promise<string> {
  const { data, error } = await getCustomer(customerId);
  if (error) throw new Error(error.message);
  const portalUrl = data.data.attributes.urls.customer_portal;
  if (!portalUrl) throw new Error("Customer portal URL not available");
  return portalUrl;
}

// Get full subscription details from LemonSqueezy
export async function getSubscriptionDetails(subscriptionId: string): Promise<{
  status: string;
  statusFormatted: string;
  productName: string;
  variantName: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  cancelled: boolean;
  customerPortalUrl: string;
  updatePaymentMethodUrl: string;
} | null> {
  const { data, error } = await getSubscription(subscriptionId);

  if (error || !data?.data?.attributes) {
    console.error("Failed to get subscription:", error?.message);
    return null;
  }

  const attrs = data.data.attributes;
  return {
    status: attrs.status,
    statusFormatted: attrs.status_formatted,
    productName: attrs.product_name,
    variantName: attrs.variant_name,
    cardBrand: attrs.card_brand,
    cardLastFour: attrs.card_last_four,
    renewsAt: attrs.renews_at,
    endsAt: attrs.ends_at,
    trialEndsAt: attrs.trial_ends_at,
    cancelled: attrs.cancelled,
    customerPortalUrl: attrs.urls.customer_portal,
    updatePaymentMethodUrl: attrs.urls.update_payment_method,
  };
}

// Validate license key for dataset downloads (returns full details)
export async function validateDatasetLicenseKey(licenseKey: string): Promise<{
  valid: boolean;
  licenseKeyId?: number;
  status?: string;
  activationLimit?: number;
  activationUsage?: number;
  expiresAt?: string | null;
}> {
  const { data, error } = await validateLicense(licenseKey);
  if (error || !data) return { valid: false };

  return {
    valid: data.valid,
    licenseKeyId: data.license_key?.id,
    status: data.license_key?.status,
    activationLimit: data.license_key?.activation_limit,
    activationUsage: data.license_key?.activation_usage,
    expiresAt: data.license_key?.expires_at,
  };
}

// Get dataset tier from variant ID
export function getDatasetTierFromVariant(
  variantId: string | number | undefined,
): DatasetTier | null {
  if (!variantId) return null;
  const variantIdStr = String(variantId);

  for (const tier of ["STARTER", "STANDARD", "FRESH", "PREMIUM"] as const) {
    if (LEMON_SQUEEZY_CONFIG.datasetVariants[tier] === variantIdStr) {
      return tier;
    }
  }

  return null;
}

// Check if variant is a dataset product
export function isDatasetVariant(
  variantId: string | number | undefined,
): boolean {
  return getDatasetTierFromVariant(variantId) !== null;
}

// Creates checkout URL for dataset purchase
export async function createDatasetCheckout(
  tier: DatasetTier,
  email?: string,
): Promise<string> {
  const variantId = LEMON_SQUEEZY_CONFIG.datasetVariants[tier];

  // Validate variant ID is configured
  if (!variantId || variantId === "TBD") {
    throw new Error(
      `Variant ID for ${tier} dataset is not configured. Please set the variant ID in lemonSqueezy.service.ts`,
    );
  }

  const { data, error } = await createCheckout(
    LEMON_SQUEEZY_CONFIG.storeId,
    variantId,
    {
      checkoutData: {
        email,
        custom: {
          dataset_tier: tier,
        },
      },
      productOptions: {
        redirectUrl: `${env.NEXT_PUBLIC_BASE_URL}/research/download`,
        enabledVariants: [Number(variantId)],
      },
    },
  );

  if (error) {
    throw new Error(
      `Failed to create checkout: ${error.message}. Check that variant ID ${variantId} exists in your LemonSqueezy store.`,
    );
  }

  if (!data?.data?.attributes?.url) {
    throw new Error("Checkout URL not returned from LemonSqueezy");
  }

  return data.data.attributes.url;
}

// Verify webhook signature (per LS docs)
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const hmac = crypto.createHmac("sha256", env.LEMON_SQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
