import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";

import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";
import { env } from "@/env";
import { getTierFromProductId } from "@/server/services/polar.service";

/**
 * Polar webhook handler for SwipeStats+ subscriptions.
 *
 * Maps Polar events onto the existing user billing fields:
 *   swipestatsTier, subscriptionProviderId, subscriptionCurrentPeriodEnd, isLifetime
 *
 * Datasets are NOT handled here — they remain on LemonSqueezy and are fulfilled
 * on-demand via license-key validation.
 */

/** Resolve our user id from event metadata or the linked external customer id. */
function resolveUserId(data: {
  metadata?: Record<string, unknown>;
  customer?: { externalId?: string | null };
}): string | null {
  const fromMeta = data.metadata?.user_id;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
  return data.customer?.externalId ?? null;
}

function log(type: string, userId: string | null, detail: string) {
  console.log(`[Polar Webhook] ${type} — user=${userId ?? "?"} — ${detail}`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!env.POLAR_WEBHOOK_SECRET) {
    console.error("[Polar Webhook] POLAR_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // 1. Verify signature
  let event: ReturnType<typeof validateEvent>;
  try {
    const headers = Object.fromEntries(request.headers.entries());
    event = validateEvent(rawBody, headers, env.POLAR_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    throw error;
  }

  // 2. Handle event
  try {
    switch (event.type) {
      // New / active / changed subscription → grant tier, track period end.
      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.uncanceled": {
        const sub = event.data;
        const userId = resolveUserId(sub);
        const info = getTierFromProductId(sub.productId);

        if (!userId || !info) {
          log(event.type, userId, "skipped (no user or unknown product)");
          break;
        }

        await db
          .update(userTable)
          .set({
            swipestatsTier: info.tier,
            subscriptionProviderId: sub.id,
            subscriptionCurrentPeriodEnd: sub.currentPeriodEnd,
            isLifetime: false,
          })
          .where(eq(userTable.id, userId));

        log(event.type, userId, `${info.tier} (${info.billingPeriod})`);
        break;
      }

      // Cancellation scheduled — keep access until the period/end date.
      // getEffectiveTier() downgrades once that date passes.
      case "subscription.canceled": {
        const sub = event.data;
        const userId = resolveUserId(sub);
        if (!userId) {
          log(event.type, userId, "skipped (no user)");
          break;
        }

        const accessUntil = sub.endsAt ?? sub.currentPeriodEnd ?? null;
        await db
          .update(userTable)
          .set({ subscriptionCurrentPeriodEnd: accessUntil })
          .where(eq(userTable.id, userId));

        log(
          event.type,
          userId,
          `access until ${accessUntil?.toISOString() ?? "n/a"}`,
        );
        break;
      }

      // Access actually removed (period ended / payment failed permanently).
      case "subscription.revoked": {
        const sub = event.data;
        const userId = resolveUserId(sub);
        if (!userId) {
          log(event.type, userId, "skipped (no user)");
          break;
        }

        await db
          .update(userTable)
          .set({
            swipestatsTier: "FREE",
            subscriptionCurrentPeriodEnd: null,
            isLifetime: false,
          })
          .where(eq(userTable.id, userId));

        log(event.type, userId, "downgraded to FREE");
        break;
      }

      // One-time (lifetime) purchase. Subscription orders are handled via the
      // subscription.* events above, so ignore orders tied to a subscription.
      case "order.created": {
        const order = event.data;
        const info = getTierFromProductId(order.productId);

        if (info?.billingPeriod !== "lifetime" || order.subscriptionId) {
          break;
        }

        const userId = resolveUserId(order);
        if (!userId) {
          log(event.type, userId, "skipped (no user)");
          break;
        }

        await db
          .update(userTable)
          .set({
            swipestatsTier: info.tier,
            isLifetime: true,
            subscriptionCurrentPeriodEnd: null,
          })
          .where(eq(userTable.id, userId));

        log(event.type, userId, `${info.tier} lifetime`);
        break;
      }

      // Refunded lifetime purchase → downgrade.
      case "order.refunded": {
        const order = event.data;
        const info = getTierFromProductId(order.productId);

        if (info?.billingPeriod !== "lifetime" || order.subscriptionId) {
          break;
        }

        const userId = resolveUserId(order);
        if (!userId) break;

        await db
          .update(userTable)
          .set({
            swipestatsTier: "FREE",
            isLifetime: false,
            subscriptionCurrentPeriodEnd: null,
          })
          .where(eq(userTable.id, userId));

        log(event.type, userId, "lifetime refunded → FREE");
        break;
      }

      default:
        // Ignore unhandled events (checkout.*, customer.*, benefit.*, etc.)
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error(`[Polar Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
