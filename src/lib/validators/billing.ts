import { z } from "zod";

/**
 * Billing validators
 *
 * Zod schemas for subscription billing operations.
 */

// Billing tier (exclude FREE - only paid tiers for checkout)
const PAID_TIERS = ["PLUS", "ELITE"] as const;
export const paidTierSchema = z.enum(PAID_TIERS);

// Billing period options
const BILLING_PERIODS = ["monthly", "yearly", "lifetime"] as const;
export const billingPeriodSchema = z.enum(BILLING_PERIODS);

// Combined checkout schema
export const createCheckoutSchema = z.object({
  tier: paidTierSchema,
  billingPeriod: billingPeriodSchema,
});

// Type exports
export type PaidTier = z.infer<typeof paidTierSchema>;
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;
export type CreateCheckout = z.infer<typeof createCheckoutSchema>;
