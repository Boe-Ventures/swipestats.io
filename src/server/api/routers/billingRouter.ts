import { eq } from "drizzle-orm";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { userTable } from "@/server/db/schema";
import {
  getEffectiveTier,
  getFeatureLimits,
} from "@/server/services/gating.service";
import {
  createUpgradeCheckout,
  getSubscriptionDetails,
} from "@/server/services/lemonSqueezy.service";
import { paidTierSchema, billingPeriodSchema } from "@/lib/validators";

import { protectedProcedure } from "../trpc";

export const billingRouter = {
  // Get current subscription status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });

    if (!user) throw new Error("User not found");

    return {
      tier: getEffectiveTier(user),
      storedTier: user.swipestatsTier,
      isLifetime: user.isLifetime,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      hasActiveSubscription: getEffectiveTier(user) !== "FREE",
      features: getFeatureLimits(user),
    };
  }),

  // Create checkout session for upgrade
  createCheckout: protectedProcedure
    .input(
      z.object({
        tier: paidTierSchema,
        billingPeriod: billingPeriodSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only pass email if user is not anonymous
      // Anonymous users have emails like "xxx@anonymous.swipestats.io"
      const email =
        ctx.session.user.isAnonymous === true
          ? undefined
          : (ctx.session.user.email ?? undefined);

      const checkoutUrl = await createUpgradeCheckout(
        ctx.session.user.id,
        email,
        input.tier,
        input.billingPeriod,
      );

      return { checkoutUrl };
    }),

  // Get customer portal URL (for managing subscription)
  getPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });

    if (!user?.subscriptionProviderId) {
      return { portalUrl: null };
    }

    // Fetch subscription details which includes pre-signed portal URL
    const subscriptionDetails = await getSubscriptionDetails(
      user.subscriptionProviderId,
    );

    return {
      portalUrl: subscriptionDetails?.customerPortalUrl ?? null,
    };
  }),

  // Get full subscription status including LemonSqueezy details
  getFullStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });

    if (!user) throw new Error("User not found");

    const baseStatus = {
      tier: getEffectiveTier(user),
      storedTier: user.swipestatsTier,
      isLifetime: user.isLifetime,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      hasActiveSubscription: getEffectiveTier(user) !== "FREE",
      features: getFeatureLimits(user),
    };

    // If user has a subscription, fetch additional details from LemonSqueezy
    if (user.subscriptionProviderId && !user.isLifetime) {
      const subscriptionDetails = await getSubscriptionDetails(
        user.subscriptionProviderId,
      );

      return {
        ...baseStatus,
        subscription: subscriptionDetails
          ? {
              status: subscriptionDetails.status,
              statusFormatted: subscriptionDetails.statusFormatted,
              productName: subscriptionDetails.productName,
              variantName: subscriptionDetails.variantName,
              cardBrand: subscriptionDetails.cardBrand,
              cardLastFour: subscriptionDetails.cardLastFour,
              renewsAt: subscriptionDetails.renewsAt,
              endsAt: subscriptionDetails.endsAt,
              cancelled: subscriptionDetails.cancelled,
              customerPortalUrl: subscriptionDetails.customerPortalUrl,
              updatePaymentMethodUrl:
                subscriptionDetails.updatePaymentMethodUrl,
            }
          : null,
      };
    }

    return {
      ...baseStatus,
      subscription: null,
    };
  }),
} satisfies TRPCRouterRecord;
