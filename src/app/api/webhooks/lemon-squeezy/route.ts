import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";
import {
  verifyWebhookSignature,
  getTierFromVariantId,
  getDatasetTierFromVariant,
  getOrderDetails,
  DATASET_PRODUCTS,
  SWIPESTATS_PRODUCTS,
  type DatasetTier,
} from "@/server/services/lemonSqueezy.service";
import {
  ensureDatasetExportForLicense,
  generateDatasetForExport,
} from "@/server/services/datasetExport.service";
import { trackServerEvent } from "@/server/services/analytics.service";

// Premium dataset exports are streamed in the background after the webhook
// response and can legitimately take several minutes.
export const maxDuration = 800;

// Enhanced logging helper
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function logWebhookEvent(
  eventName: string,
  userId: string,
  details: {
    action: string;
    tierChange?: { from?: string; to: string };
    billing?: string;
    periodStart?: string;
    periodEnd?: string;
    testMode: boolean;
    reason?: string;
  },
) {
  const emoji =
    {
      order_created: "💳",
      order_refunded: "↩️",
      subscription_created: "✨",
      subscription_updated: "🔄",
      subscription_cancelled: "⏸️",
      subscription_expired: "❌",
      subscription_resumed: "▶️",
    }[eventName] || "📦";

  const testModeIndicator = details.testMode ? "🧪 TEST MODE" : "";

  console.log(
    `\n${emoji} [Webhook] ${eventName.toUpperCase()} ${testModeIndicator}`,
  );
  console.log(`  └─ User: ${userId}`);

  if (details.tierChange) {
    const from = details.tierChange.from || "FREE";
    const to = details.tierChange.to;
    const billing = details.billing ? ` (${details.billing})` : "";
    console.log(`  └─ Tier: ${from} → ${to}${billing}`);
  }

  if (details.periodStart && details.periodEnd) {
    console.log(
      `  └─ Period: ${formatDate(details.periodStart)} - ${formatDate(details.periodEnd)}`,
    );
  } else if (details.periodEnd) {
    console.log(`  └─ Access Until: ${formatDate(details.periodEnd)}`);
  }

  if (details.reason) {
    console.log(`  └─ Reason: ${details.reason}`);
  }

  console.log(`  └─ Action: ${details.action}\n`);
}

// Webhook event types we handle
type WebhookEventName =
  | "order_created" // Lifetime purchases
  | "order_refunded" // Refunded lifetime purchases
  | "subscription_created" // New subscription
  | "subscription_updated" // Plan changes, renewals
  | "subscription_cancelled" // Cancellation
  | "subscription_expired" // Subscription expired
  | "subscription_resumed" // Subscription resumed
  | "license_key_created"; // Dataset license-key fulfillment

interface WebhookPayload {
  meta: {
    event_name: WebhookEventName;
    test_mode?: boolean;
    custom_data?: {
      user_id?: string;
      dataset_tier?: string;
      checkout_attempt_id?: string;
      checkout_surface?: string;
      product_line?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      // Order attributes (for order_created, order_refunded)
      // See: https://docs.lemonsqueezy.com/api/orders#the-order-object
      status?: string; // Order status: "pending", "paid", "failed", "refunded"
      first_order_item?: {
        variant_id: number;
      };
      user_email?: string; // Customer email
      order_number?: number; // Order number
      // License key attributes (for products with license keys)
      order_id?: number;
      product_id?: number;
      key?: string;
      activation_limit?: number;
      expires_at?: string | null;
      // Subscription attributes (for subscription_* events)
      // See: https://docs.lemonsqueezy.com/api/subscriptions#the-subscription-object
      // Note: status field exists for both orders and subscriptions, but with different values
      variant_id?: number;
      renews_at?: string | null; // Next renewal date (for active subscriptions)
      ends_at?: string | null; // End date (for cancelled subscriptions)
      cancelled_at?: string | null;
    };
  };
}

function parseDatasetTier(tier: string | undefined): DatasetTier | null {
  if (
    tier === "STARTER" ||
    tier === "STANDARD" ||
    tier === "FRESH" ||
    tier === "PREMIUM"
  ) {
    return tier;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    // 1. Get raw body and signature
    const rawBody = await request.text();
    const signature = request.headers.get("X-Signature");
    const eventNameHeader = request.headers.get("X-Event-Name");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // 2. Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse payload and validate event name
    const payload = JSON.parse(rawBody) as WebhookPayload;

    // Use event_name from payload as source of truth (per LemonSqueezy docs)
    const eventNameFromPayload = payload.meta.event_name;

    // Validate header matches payload (security check)
    if (!eventNameHeader) {
      return NextResponse.json(
        { error: "Missing X-Event-Name header" },
        { status: 400 },
      );
    }

    if (eventNameHeader !== eventNameFromPayload) {
      console.warn(
        `[Webhook] Event name mismatch: header=${eventNameHeader}, payload=${eventNameFromPayload}`,
      );
      return NextResponse.json(
        { error: "Event name mismatch between header and payload" },
        { status: 400 },
      );
    }

    const eventName = eventNameFromPayload;
    const userId = payload.meta.custom_data?.user_id;
    const checkoutAttemptId = payload.meta.custom_data?.checkout_attempt_id;
    const testMode = payload.meta.test_mode ?? false;

    // Track what action we took for response
    let action = "processed";
    let details: Record<string, unknown> = {};

    if (eventName === "license_key_created") {
      const licenseKey = payload.data.attributes.key;
      const orderId = payload.data.attributes.order_id?.toString();
      const licenseKeyId = payload.data.id;

      if (!licenseKey) {
        console.warn("[Webhook] License key event missing key", {
          eventName,
          licenseKeyId,
          orderId,
        });

        return NextResponse.json({
          received: true,
          event: eventName,
          action: "skipped",
          reason: "missing_license_key",
          test_mode: testMode,
        });
      }

      let datasetTier = parseDatasetTier(
        payload.meta.custom_data?.dataset_tier,
      );
      let customerEmail = payload.data.attributes.user_email;

      if (!datasetTier && orderId) {
        const orderDetails = await getOrderDetails(orderId);
        datasetTier = getDatasetTierFromVariant(orderDetails?.variantId);
        customerEmail ??= orderDetails?.customerEmail;
      }

      if (!datasetTier) {
        console.log("[Webhook] Skipping non-dataset license key", {
          eventName,
          licenseKeyId,
          orderId,
          productId: payload.data.attributes.product_id,
        });

        return NextResponse.json({
          received: true,
          event: eventName,
          action: "skipped",
          reason: "non_dataset_license_key",
          test_mode: testMode,
        });
      }

      const product = DATASET_PRODUCTS[datasetTier];
      const { exportRecord, created } = await ensureDatasetExportForLicense({
        licenseKey,
        licenseKeyId,
        orderId,
        tier: datasetTier,
        customerEmail,
        expiresAt: payload.data.attributes.expires_at
          ? new Date(payload.data.attributes.expires_at)
          : null,
      });

      const analyticsUserId =
        userId ?? `dataset_license:${licenseKeyId ?? orderId ?? "unknown"}`;

      trackServerEvent(analyticsUserId, "dataset_purchase_completed", {
        productLine: "dataset",
        billingProvider: "lemon_squeezy",
        checkoutAttemptId,
        orderId: orderId ?? null,
        licenseKeyId,
        tier: datasetTier,
        amount: product.price,
        currency: "usd",
        profileCount: product.profileCount,
        recency: product.recency,
        testMode,
      });

      if (exportRecord) {
        trackServerEvent(analyticsUserId, "dataset_export_queued", {
          exportId: exportRecord.id,
          checkoutAttemptId,
          orderId: orderId ?? null,
          licenseKeyId,
          tier: datasetTier,
          profileCount: product.profileCount,
          recency: product.recency,
          source: "webhook",
          alreadyExisted: !created,
          testMode,
        });
      }

      if (exportRecord && created) {
        waitUntil(
          generateDatasetForExport(exportRecord.id).catch((error) => {
            console.error(
              `Failed to generate dataset ${exportRecord.id}:`,
              error,
            );
          }),
        );
      }

      return NextResponse.json({
        received: true,
        event: eventName,
        action: created ? "dataset_export_queued" : "dataset_export_exists",
        export_id: exportRecord?.id,
        tier: datasetTier,
        test_mode: testMode,
      });
    }

    // 4. User subscription events require userId.
    if (!userId) {
      console.warn(`[Webhook] No user_id for ${eventName}`, { eventName });
      return NextResponse.json({
        received: true,
        event: eventName,
        action: "skipped",
        reason: "no_user_id",
        test_mode: testMode,
      });
    }

    // 5. Handle user subscription events
    switch (eventName) {
      case "order_created": {
        // Lifetime subscription purchase
        const variantId = payload.data.attributes.first_order_item?.variant_id;
        const variantInfo = getTierFromVariantId(variantId);

        if (variantInfo?.billingPeriod === "lifetime") {
          await db
            .update(userTable)
            .set({
              swipestatsTier: variantInfo.tier,
              isLifetime: true,
              subscriptionCurrentPeriodEnd: null,
            })
            .where(eq(userTable.id, userId));

          logWebhookEvent(eventName, userId, {
            action: "upgraded",
            tierChange: { to: variantInfo.tier },
            billing: "lifetime",
            testMode,
          });

          action = "upgraded";
          details = { tier: variantInfo.tier, lifetime: true };

          const amount =
            SWIPESTATS_PRODUCTS[variantInfo.tier][variantInfo.billingPeriod]
              .price;

          trackServerEvent(userId, "subscription_activated", {
            tier: variantInfo.tier,
            source: "direct_purchase",
            billingPeriod: variantInfo.billingPeriod,
            checkoutAttemptId,
          });

          trackServerEvent(userId, "billing_payment_successful", {
            productLine: "subscription",
            billingProvider: "lemon_squeezy",
            orderId: payload.data.id,
            subscriptionId: null,
            amount,
            currency: "usd",
            tier: variantInfo.tier,
            billingPeriod: variantInfo.billingPeriod,
            checkoutAttemptId,
            testMode,
          });
        } else {
          logWebhookEvent(eventName, userId, {
            action: "skipped",
            reason: "non_lifetime_order",
            testMode,
          });
          action = "skipped";
          details = { reason: "non_lifetime_order" };
        }
        break;
      }

      case "order_refunded": {
        // Refunded lifetime purchase - downgrade to FREE
        const variantId = payload.data.attributes.first_order_item?.variant_id;
        const variantInfo = getTierFromVariantId(variantId);

        if (variantInfo?.billingPeriod === "lifetime") {
          await db
            .update(userTable)
            .set({
              swipestatsTier: "FREE",
              isLifetime: false,
              subscriptionCurrentPeriodEnd: null,
            })
            .where(eq(userTable.id, userId));

          logWebhookEvent(eventName, userId, {
            action: "downgraded",
            tierChange: { from: variantInfo.tier, to: "FREE" },
            billing: "lifetime",
            testMode,
          });
          action = "downgraded";
          details = { tier: "FREE", lifetime: false };
        } else {
          logWebhookEvent(eventName, userId, {
            action: "skipped",
            reason: "non_lifetime_refund",
            testMode,
          });
          action = "skipped";
          details = { reason: "non_lifetime_refund" };
        }
        break;
      }

      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed": {
        const variantId = payload.data.attributes.variant_id;
        const variantInfo = getTierFromVariantId(variantId);
        // Use renews_at for active subscriptions (when current period ends)
        // For cancelled subscriptions, ends_at is set but we handle that separately
        const periodEnd =
          payload.data.attributes.renews_at ?? payload.data.attributes.ends_at;

        if (variantInfo) {
          await db
            .update(userTable)
            .set({
              swipestatsTier: variantInfo.tier,
              subscriptionProviderId: payload.data.id,
              subscriptionCurrentPeriodEnd: periodEnd
                ? new Date(periodEnd)
                : null,
              isLifetime: false,
            })
            .where(eq(userTable.id, userId));

          logWebhookEvent(eventName, userId, {
            action:
              eventName === "subscription_created" ? "activated" : "updated",
            tierChange: { to: variantInfo.tier },
            billing: variantInfo.billingPeriod,
            periodEnd: periodEnd ?? undefined,
            testMode,
          });

          action =
            eventName === "subscription_created" ? "activated" : "updated";
          details = {
            tier: variantInfo.tier,
            billing: variantInfo.billingPeriod,
            period_end: periodEnd,
          };

          if (eventName === "subscription_created") {
            const amount =
              SWIPESTATS_PRODUCTS[variantInfo.tier][variantInfo.billingPeriod]
                .price;

            trackServerEvent(userId, "subscription_activated", {
              tier: variantInfo.tier,
              source: "direct_purchase",
              billingPeriod: variantInfo.billingPeriod,
              checkoutAttemptId,
            });

            trackServerEvent(userId, "billing_payment_successful", {
              productLine: "subscription",
              billingProvider: "lemon_squeezy",
              orderId: null,
              subscriptionId: payload.data.id,
              amount,
              currency: "usd",
              tier: variantInfo.tier,
              billingPeriod: variantInfo.billingPeriod,
              checkoutAttemptId,
              testMode,
            });
          } else {
            trackServerEvent(userId, "billing_subscription_updated", {
              subscriptionId: payload.data.id,
              changeType: "plan_changed",
              newTier: variantInfo.tier,
            });
          }
        } else {
          logWebhookEvent(eventName, userId, {
            action: "skipped",
            reason: "unknown_variant",
            testMode,
          });
          action = "skipped";
          details = { reason: "unknown_variant" };
        }
        break;
      }

      case "subscription_cancelled": {
        // Update period end to ends_at so user keeps access until cancellation date
        // Don't downgrade immediately - getEffectiveTier() will handle access based on period end
        const endsAt = payload.data.attributes.ends_at;
        const variantInfo = getTierFromVariantId(
          payload.data.attributes.variant_id,
        );
        const cancelledTier = variantInfo?.tier ?? "PLUS";

        if (endsAt) {
          await db
            .update(userTable)
            .set({
              subscriptionCurrentPeriodEnd: new Date(endsAt),
            })
            .where(eq(userTable.id, userId));

          logWebhookEvent(eventName, userId, {
            action: "cancelled",
            periodEnd: endsAt ?? undefined,
            testMode,
          });

          action = "cancelled";
          details = { access_until: endsAt };

          trackServerEvent(userId, "subscription_cancelled", {
            tier: cancelledTier,
            reason: "user_requested",
            hadActiveSubscription: true,
          });
        } else {
          logWebhookEvent(eventName, userId, {
            action: "cancelled",
            reason: "no_ends_at",
            testMode,
          });
          action = "cancelled";
          details = { access_until: null };
        }
        break;
      }

      case "subscription_expired": {
        const variantInfo = getTierFromVariantId(
          payload.data.attributes.variant_id,
        );
        const expiredTier = variantInfo?.tier ?? "PLUS";

        // Subscription expired - downgrade to FREE
        await db
          .update(userTable)
          .set({
            swipestatsTier: "FREE",
            subscriptionCurrentPeriodEnd: null,
            isLifetime: false,
          })
          .where(eq(userTable.id, userId));

        logWebhookEvent(eventName, userId, {
          action: "expired",
          tierChange: { to: "FREE" },
          testMode,
        });
        action = "expired";
        details = { tier: "FREE" };

        trackServerEvent(userId, "subscription_cancelled", {
          tier: expiredTier,
          reason: "payment_failed",
          hadActiveSubscription: true,
        });
        break;
      }

      default: {
        // Log unhandled events but don't fail
        logWebhookEvent(eventName, userId, {
          action: "ignored",
          reason: "unhandled_event",
          testMode,
        });
        action = "ignored";
        details = { reason: "unhandled_event" };
        break;
      }
    }

    return NextResponse.json({
      received: true,
      event: eventName,
      action,
      ...details,
      test_mode: testMode,
    });
  } catch (error) {
    console.error("[Webhook] Error processing:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
