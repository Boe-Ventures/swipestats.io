import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";
import {
  verifyWebhookSignature,
  getTierFromVariantId,
} from "@/server/services/lemonSqueezy.service";

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
  | "subscription_resumed"; // Subscription resumed

interface WebhookPayload {
  meta: {
    event_name: WebhookEventName;
    test_mode?: boolean;
    custom_data?: {
      user_id?: string;
      dataset_tier?: string;
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
      license_key?: {
        id: string;
        key: string;
        activation_limit?: number;
        expires_at?: string | null;
      };
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
    const testMode = payload.meta.test_mode ?? false;

    // Track what action we took for response
    let action = "processed";
    let details: Record<string, unknown> = {};

    // 4. All events require userId (dataset purchases handled on-demand via license key validation)
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
