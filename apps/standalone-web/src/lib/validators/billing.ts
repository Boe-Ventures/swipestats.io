import { z } from "zod";

/**
 * Billing validators
 *
 * Zod schemas for subscription billing operations.
 */

// Billing tier (exclude FREE - only paid tiers for checkout)
export const PAID_TIERS = ["PLUS", "ELITE"] as const;
export const paidTierSchema = z.enum(PAID_TIERS);

// Billing period options
export const BILLING_PERIODS = ["monthly", "yearly", "lifetime"] as const;
export const billingPeriodSchema = z.enum(BILLING_PERIODS);

export const SUBSCRIPTION_CHECKOUT_SURFACES = [
  "insights_compare",
  "upgrade_modal",
  "account",
  "pricing_page",
  "unknown",
] as const;

export const DATASET_CHECKOUT_SURFACES = [
  "research_pricing",
  "home",
  "unknown",
] as const;

export const BILLING_SURFACES = [
  "insights_compare",
  "upgrade_modal",
  "account",
  "pricing_page",
  "research_pricing",
  "home",
  "unknown",
] as const;

export const DATASET_TIERS = [
  "STARTER",
  "STANDARD",
  "FRESH",
  "PREMIUM",
] as const;

export const BILLING_PROVIDERS = ["lemon_squeezy"] as const;

export const subscriptionCheckoutSurfaceSchema = z
  .enum(SUBSCRIPTION_CHECKOUT_SURFACES)
  .default("unknown")
  .catch("unknown");

export const datasetCheckoutSurfaceSchema = z
  .enum(DATASET_CHECKOUT_SURFACES)
  .default("research_pricing")
  .catch("research_pricing");

// Combined checkout schema
export const createCheckoutSchema = z.object({
  tier: paidTierSchema,
  billingPeriod: billingPeriodSchema,
  surface: subscriptionCheckoutSurfaceSchema.optional(),
});

// Type exports
export type PaidTier = z.infer<typeof paidTierSchema>;
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;
export type BillingSurface = (typeof BILLING_SURFACES)[number];
export type SubscriptionCheckoutSurface = z.infer<
  typeof subscriptionCheckoutSurfaceSchema
>;
export type DatasetCheckoutSurface = z.infer<
  typeof datasetCheckoutSurfaceSchema
>;
export type DatasetTier = (typeof DATASET_TIERS)[number];
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];
export type CreateCheckout = z.infer<typeof createCheckoutSchema>;
