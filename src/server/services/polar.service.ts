import { Polar } from "@polar-sh/sdk";

import { env, envSelect } from "@/env";
import type { PaidTier, BillingPeriod } from "@/lib/validators";

/**
 * Polar billing service (subscriptions).
 *
 * Mirrors the structure of lemonSqueezy.service.ts. Polar is the Merchant of
 * Record for SwipeStats+ subscriptions; datasets remain on LemonSqueezy for now.
 *
 * Product IDs live in the "swipestats" Polar organization. We select sandbox vs
 * production IDs the same way LemonSqueezy selects test vs prod variants
 * (via envSelect / NEXT_PUBLIC_IS_PRODUCTION). Sandbox IDs are TBD until a
 * sandbox org + products are created.
 */
const POLAR_PRODUCTS = {
  PLUS: {
    monthly: envSelect({
      prod: "102a68af-4fe4-4718-b7dd-dae52dcea59c",
      test: "", // sandbox product id — TBD
    }),
    yearly: envSelect({ prod: "", test: "" }), // not created on Polar yet
    lifetime: envSelect({
      prod: "d118a1bd-9aad-4ee0-bda8-2ca38e1cf6ad",
      test: "",
    }),
  },
  ELITE: {
    monthly: envSelect({
      prod: "0ac20a96-2af6-4e05-af25-f951f44236f8",
      test: "",
    }),
    yearly: envSelect({ prod: "", test: "" }),
    lifetime: envSelect({
      prod: "c3036ae2-1e1a-4a74-a536-b27f08397a49",
      test: "",
    }),
  },
} as const satisfies Record<PaidTier, Record<BillingPeriod, string>>;

let _client: Polar | null = null;

function getPolarClient(): Polar {
  if (!env.POLAR_ACCESS_TOKEN) {
    throw new Error(
      "POLAR_ACCESS_TOKEN is not configured. Set it to your Polar organization access token.",
    );
  }
  _client ??= new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    // Sandbox in dev/preview, production in true production — matches the
    // environment the product IDs above are selected for.
    server: env.NEXT_PUBLIC_IS_PRODUCTION ? "production" : "sandbox",
  });
  return _client;
}

/**
 * Map a Polar product ID back to a tier + billing period.
 * Used by the webhook handler to identify what was purchased.
 */
export function getTierFromProductId(
  productId: string | null | undefined,
): { tier: PaidTier; billingPeriod: BillingPeriod } | null {
  if (!productId) return null;

  for (const tier of ["PLUS", "ELITE"] as const) {
    for (const period of ["monthly", "yearly", "lifetime"] as const) {
      if (POLAR_PRODUCTS[tier][period] === productId) {
        return { tier, billingPeriod: period };
      }
    }
  }
  return null;
}

/**
 * Create a Polar checkout session for an upgrade.
 * Links the Polar customer to our user via externalCustomerId so we can later
 * open the customer portal and so webhooks can resolve the user.
 */
export async function createUpgradeCheckout(
  userId: string,
  email: string | undefined,
  tier: PaidTier,
  billingPeriod: BillingPeriod,
): Promise<string> {
  const productId = POLAR_PRODUCTS[tier][billingPeriod];

  if (!productId) {
    throw new Error(
      `Polar product for ${tier} ${billingPeriod} is not configured.`,
    );
  }

  const polar = getPolarClient();

  const checkout = await polar.checkouts.create({
    products: [productId],
    externalCustomerId: userId,
    customerEmail: email,
    successUrl: `${env.NEXT_PUBLIC_BASE_URL}/app/dashboard?upgraded=true`,
    // Redundant with externalCustomerId, but lets the webhook resolve the user
    // even if customer linking ever changes.
    metadata: { user_id: userId },
  });

  return checkout.url;
}

/**
 * Get the Polar customer portal URL for a user (manage subscription / payment
 * method). Keyed by our user id via externalCustomerId.
 */
export async function getCustomerPortalUrl(
  userId: string,
): Promise<string | null> {
  const polar = getPolarClient();
  try {
    const session = await polar.customerSessions.create({
      externalCustomerId: userId,
    });
    return session.customerPortalUrl;
  } catch (error) {
    console.error("[Polar] Failed to create customer session:", error);
    return null;
  }
}

/**
 * Full subscription details for the account UI. Returns the same shape the
 * LemonSqueezy service did so the SubscriptionCard keeps working. Polar does
 * not expose card brand/last-4 here, so those are null.
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<{
  status: string;
  statusFormatted: string;
  productName: string;
  variantName: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  cancelled: boolean;
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
} | null> {
  const polar = getPolarClient();
  try {
    const sub = await polar.subscriptions.get({ id: subscriptionId });
    const info = getTierFromProductId(sub.productId);
    const tierName = info ? `SwipeStats+ ${info.tier}` : "SwipeStats+";

    const portalUrl = sub.customer.externalId
      ? await getCustomerPortalUrl(sub.customer.externalId)
      : null;

    const statusStr = String(sub.status);

    return {
      status: statusStr,
      statusFormatted: statusStr.charAt(0).toUpperCase() + statusStr.slice(1),
      productName: tierName,
      variantName: info?.billingPeriod ?? "",
      cardBrand: null,
      cardLastFour: null,
      renewsAt: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
      endsAt: sub.endsAt ? sub.endsAt.toISOString() : null,
      cancelled: sub.cancelAtPeriodEnd,
      customerPortalUrl: portalUrl,
      updatePaymentMethodUrl: portalUrl,
    };
  } catch (error) {
    console.error("[Polar] Failed to get subscription:", error);
    return null;
  }
}
