import { eq } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";

import { env, envSelect } from "@/env";
import type {
  ServerAnalyticsEventName,
  ServerEventPropertiesDefinition,
} from "@/lib/analytics/analytics.types";
import { db } from "@/server/db";
import {
  hingeProfileTable,
  mediaTable,
  tinderProfileTable,
  userTable,
} from "@/server/db/schema";

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface PlainText {
  type: "plain_text";
  text: string;
  emoji?: boolean;
}

interface MrkdwnText {
  type: "mrkdwn";
  text: string;
  verbatim?: boolean;
}

type TextObject = PlainText | MrkdwnText;

interface HeaderBlock {
  type: "header";
  text: PlainText;
}

interface SectionBlock {
  type: "section";
  text?: TextObject;
  fields?: TextObject[];
}

interface DividerBlock {
  type: "divider";
}

interface ImageElement {
  type: "image";
  image_url: string;
  alt_text: string;
}

interface ContextBlock {
  type: "context";
  elements: (TextObject | ImageElement)[];
}

interface ButtonElement {
  type: "button";
  text: PlainText;
  action_id: string;
  url?: string;
  value?: string;
  style?: "primary" | "danger";
}

interface ActionsBlock {
  type: "actions";
  elements: ButtonElement[];
}

interface ImageBlock {
  type: "image";
  image_url: string;
  alt_text: string;
  title?: PlainText;
}

type Block =
  | HeaderBlock
  | SectionBlock
  | DividerBlock
  | ContextBlock
  | ActionsBlock
  | ImageBlock;

// =====================================================
// CHANNEL DEFINITIONS
// =====================================================

export type SlackChannel =
  | "bot-messages"
  | "ai-photos"
  | "bot-developer"
  | "sales"
  | "rich-message-test";

// =====================================================
// WEBHOOK CONFIGURATION
// =====================================================

/**
 * Webhook URLs per channel and environment
 * Production webhooks route to production channels
 * Test webhooks route to development/staging channels
 */
const CHANNEL_WEBHOOKS: Record<SlackChannel, string> = {
  "bot-messages": env.SLACK_WEBHOOK_BOT_MESSAGES,
  "ai-photos": env.SLACK_WEBHOOK_AI_PHOTOS,
  "bot-developer": env.SLACK_WEBHOOK_BOT_DEVELOPER,
  sales: env.SLACK_WEBHOOK_SALES,
  "rich-message-test": env.SLACK_WEBHOOK_RICH_MESSAGE_TEST,
};

/**
 * Environment label for visual distinction in messages
 */
const ENV_LABEL = envSelect({
  prod: "🟢 prod",
  test: "🔵 dev/test",
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/** Get webhook URL for a channel */
function getWebhookUrl(channel: SlackChannel): string {
  return CHANNEL_WEBHOOKS[channel];
}

// =====================================================
// CORE SEND FUNCTION
// =====================================================

/**
 * Send a message to Slack using incoming webhooks
 *
 * Non-blocking in serverless environments (uses waitUntil).
 * Returns immediately without blocking the response.
 *
 * INTERNAL: Use the convenience functions (sendNotification, sendEvent, sendError) instead.
 *
 * @example
 * ```ts
 * sendSlackMessage({
 *   channel: "bot-messages",
 *   text: "User signed up",
 *   blocks: [{
 *     type: "section",
 *     text: { type: "mrkdwn", text: "🎉 *New User*" }
 *   }]
 * });
 * ```
 */
function sendSlackMessage(params: {
  channel: SlackChannel;
  text: string;
  blocks?: Block[];
}): void {
  const promise = sendSlackMessageAsync(params);

  // Don't block response in serverless
  if (typeof waitUntil !== "undefined") {
    waitUntil(promise);
  } else {
    // In non-serverless environments, log errors
    void promise.catch((error) => {
      console.error("❌ [Slack] Failed to send message:", error);
    });
  }
}

/**
 * INTERNAL: Async version that returns result
 * Use this when you need to await the result (e.g., in tests)
 */
async function sendSlackMessageAsync(params: {
  channel: SlackChannel;
  text: string;
  blocks?: Block[];
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    console.log(`📤 [Slack] Sending to ${params.channel}`);

    const webhookUrl = getWebhookUrl(params.channel);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: params.text,
        blocks: params.blocks,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [Slack] Send failed:", {
        channel: params.channel,
        status: response.status,
        error: errorText,
      });
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    console.log(`✅ [Slack] Message sent to ${params.channel}`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ [Slack] Error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

// =====================================================
// IMAGE SUPPORT
// =====================================================

/**
 * INTERNAL: Send a follow-up message with images as thumbnails in context footer
 *
 * This is a defensive function that never throws - if images fail to send,
 * it just logs and continues. The main message is always prioritized.
 *
 * @param channel - Slack channel to send to
 * @param imageUrls - Array of public image URLs to display as thumbnails
 */
function sendImagesFollowUp(params: {
  channel: SlackChannel;
  imageUrls: string[];
}): void {
  // Defensive: skip if no valid URLs
  const validUrls = params.imageUrls.filter(
    (url) => url && typeof url === "string" && url.trim().length > 0,
  );

  if (validUrls.length === 0) {
    return;
  }

  // Limit to 10 images to avoid message size limits
  const limitedUrls = validUrls.slice(0, 10);

  try {
    // Create image elements for context block
    const imageElements: ImageElement[] = limitedUrls.map((url, index) => ({
      type: "image",
      image_url: url,
      alt_text: `Image ${index + 1}`,
    }));

    const blocks: Block[] = [
      {
        type: "context",
        elements: imageElements,
      },
    ];

    // Send as follow-up message (non-blocking, defensive)
    sendSlackMessage({
      channel: params.channel,
      text: `Images (${limitedUrls.length})`,
      blocks,
    });

    console.log(
      `📸 [Slack] Sent ${limitedUrls.length} image(s) to ${params.channel}`,
    );
  } catch (error) {
    // Never throw - just log and continue
    console.warn(
      "⚠️ [Slack] Failed to send images (non-critical):",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Send a simple notification with automatic environment context
 *
 * Use for quick status updates or simple messages.
 * Optionally include images that will be sent in a follow-up message.
 *
 * @example
 * ```ts
 * sendNotification({
 *   channel: "bot-messages",
 *   text: "🎉 New user signed up: user@example.com",
 *   imageUrls: ["https://example.com/profile.jpg"]
 * });
 * ```
 */
export function sendNotification(params: {
  channel: SlackChannel;
  text: string;
  imageUrls?: string[];
}): void {
  const blocks: Block[] = [
    createSectionBlock(params.text),
    createContextBlock(`${ENV_LABEL} | ${new Date().toISOString()}`),
  ];

  sendSlackMessage({
    channel: params.channel,
    text: params.text,
    blocks,
  });

  // Send images in follow-up message if provided
  if (params.imageUrls && params.imageUrls.length > 0) {
    sendImagesFollowUp({
      channel: params.channel,
      imageUrls: params.imageUrls,
    });
  }
}

/**
 * Send a structured event notification
 *
 * Formats as a section with field blocks and environment context.
 * Use for analytics events, user actions, or structured notifications.
 * Optionally include images that will be sent in a follow-up message.
 *
 * @example
 * ```ts
 * sendEvent({
 *   channel: "sales",
 *   emoji: "💰",
 *   title: "New Subscription",
 *   fields: {
 *     email: "user@example.com",
 *     plan: "pro",
 *     mrr: 29
 *   },
 *   eventName: "subscription_created",
 *   imageUrls: ["https://example.com/profile.jpg"]
 * });
 * ```
 */
export function sendEvent(params: {
  channel: SlackChannel;
  emoji: string;
  title: string;
  fields: Record<string, string | number | boolean | undefined>;
  eventName?: string;
  imageUrls?: string[];
}): void {
  const { emoji, title, fields, eventName } = params;

  const fieldBlocks: TextObject[] = Object.entries(fields)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      type: "mrkdwn" as const,
      text: `*${formatFieldName(key)}:*\n${String(value)}`,
    }));

  const contextText = eventName
    ? `${ENV_LABEL} | \`${eventName}\` | ${new Date().toISOString()}`
    : `${ENV_LABEL} | ${new Date().toISOString()}`;

  const blocks: Block[] = [
    createSectionBlock(`${emoji} *${title}*`),
    ...(fieldBlocks.length > 0
      ? [createSectionBlockWithFields(fieldBlocks)]
      : []),
    createContextBlock(contextText),
  ];

  sendSlackMessage({
    channel: params.channel,
    text: `${emoji} ${title}`,
    blocks,
  });

  // Send images in follow-up message if provided
  if (params.imageUrls && params.imageUrls.length > 0) {
    sendImagesFollowUp({
      channel: params.channel,
      imageUrls: params.imageUrls,
    });
  }
}

/**
 * Send an error notification with formatted details
 *
 * Formats error in a code block with optional context and log link.
 * Use for error monitoring and alerts.
 * Optionally include images (e.g., screenshots) that will be sent in a follow-up message.
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   sendError({
 *     channel: "bot-developer",
 *     title: "Payment Processing Failed",
 *     error: error.message,
 *     context: { userId: "123", orderId: "456" },
 *     logUrl: "https://logs.betterstack.com/...",
 *     imageUrls: ["https://example.com/screenshot.png"]
 *   });
 * }
 * ```
 */
export function sendError(params: {
  channel: SlackChannel;
  title: string;
  error: string | Error;
  context?: Record<string, string | number>;
  logUrl?: string;
  imageUrls?: string[];
}): void {
  const { title, context, logUrl } = params;
  const errorMsg =
    typeof params.error === "string" ? params.error : params.error.message;

  const contextParts: string[] = [ENV_LABEL];
  if (context) {
    contextParts.push(
      ...Object.entries(context).map(([k, v]) => `${k}: \`${v}\``),
    );
  }
  contextParts.push(new Date().toISOString());

  const blocks: Block[] = [
    createSectionBlock(`⚠️ *${title}*`),
    createSectionBlock(`*Error:*\n\`\`\`${errorMsg}\`\`\``),
  ];

  if (logUrl) {
    blocks.push(
      createActionsBlock([
        createButtonElement("View Logs", "view_logs", logUrl, "primary"),
      ]),
    );
  }

  blocks.push(createContextBlock(contextParts.join(" | ")));

  sendSlackMessage({
    channel: params.channel,
    text: `⚠️ ${title}`,
    blocks,
  });

  // Send images in follow-up message if provided
  if (params.imageUrls && params.imageUrls.length > 0) {
    sendImagesFollowUp({
      channel: params.channel,
      imageUrls: params.imageUrls,
    });
  }
}

// =====================================================
// BLOCK BUILDER UTILITIES
// =====================================================

/** INTERNAL: Create a section block with markdown text */
function createSectionBlock(text: string): SectionBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
}

/** INTERNAL: Create a section block with field blocks */
function createSectionBlockWithFields(fields: TextObject[]): SectionBlock {
  return {
    type: "section",
    fields,
  };
}

/** INTERNAL: Create a context block with markdown text */
function createContextBlock(text: string): ContextBlock {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text,
      },
    ],
  };
}

/** INTERNAL: Create a button element */
function createButtonElement(
  text: string,
  actionId: string,
  url?: string,
  style?: "primary" | "danger",
): ButtonElement {
  return {
    type: "button",
    text: {
      type: "plain_text",
      text,
    },
    action_id: actionId,
    ...(url && { url }),
    ...(style && { style }),
  };
}

/** INTERNAL: Create an actions block with buttons */
function createActionsBlock(buttons: ButtonElement[]): Block {
  return {
    type: "actions",
    elements: buttons,
  };
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * INTERNAL: Convert camelCase/snake_case to Title Case
 */
function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// =====================================================
// ANALYTICS INTEGRATION
// =====================================================

/**
 * Events we want to send to Slack
 * Subset of all analytics events - only high-value notifications
 */
const SLACK_EVENTS = [
  "tinder_profile_created",
  "tinder_profile_updated",
  "tinder_profile_upload_failed",
  "hinge_profile_created",
  "hinge_profile_updated",
  "hinge_profile_upload_failed",
  "subscription_activated",
  "subscription_cancelled",
  "billing_payment_successful", // Captures ALL payments including lifetime!
  "billing_payment_failed",
  "comparison_created",
] as const;

type SlackEventName = (typeof SLACK_EVENTS)[number];

function isSlackEvent(event: string): event is SlackEventName {
  return SLACK_EVENTS.includes(event as SlackEventName);
}

/**
 * Slack analytics provider - enriches events with DB data
 *
 * Called automatically by trackServerEvent() for all events.
 * Returns early if event isn't in SLACK_EVENTS list.
 * Fully wrapped in try-catch - never breaks analytics pipeline.
 */
export async function trackSlackEvent<T extends ServerAnalyticsEventName>(
  userId: string,
  event: T,
  properties: ServerEventPropertiesDefinition[T],
): Promise<void> {
  try {
    // Early return if not a Slack event
    if (!isSlackEvent(event)) return;

    const channel = envSelect({
      prod: "bot-messages" as const,
      test: "bot-developer" as const,
    });

    // ─────────────────────────────────────────────────
    // Tinder Profile Created
    // ─────────────────────────────────────────────────
    if (event === "tinder_profile_created") {
      const props =
        properties as ServerEventPropertiesDefinition["tinder_profile_created"];

      const [user, profile, media] = await Promise.all([
        db.query.userTable.findFirst({
          where: eq(userTable.id, userId),
          columns: { name: true, email: true },
        }),
        db.query.tinderProfileTable.findFirst({
          where: eq(tinderProfileTable.tinderId, props.tinderId),
          columns: {
            gender: true,
            ageFilterMin: true,
            ageFilterMax: true,
            city: true,
            country: true,
            bio: true,
          },
        }),
        db.query.mediaTable.findMany({
          where: eq(mediaTable.tinderProfileId, props.tinderId),
          columns: { url: true },
          limit: 5,
        }),
      ]);

      sendEvent({
        channel,
        emoji: "📊",
        title: "Tinder Profile Created",
        fields: {
          tinderId: props.tinderId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          gender: profile?.gender ?? undefined,
          age: profile?.ageFilterMin
            ? `${profile.ageFilterMin}-${profile.ageFilterMax}`
            : undefined,
          city: profile?.city ?? undefined,
          country: profile?.country ?? undefined,
          matches: props.matchCount,
          messages: props.messageCount,
          photos: props.photoCount,
          usageDays: props.usageDays,
          processingTimeMs: props.processingTimeMs,
          profileUrl: `https://swipestats.io/insights/${props.tinderId}`,
        },
        eventName: event,
        imageUrls: media
          .map((m) => m.url)
          .filter((url): url is string => !!url),
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Tinder Profile Updated
    // ─────────────────────────────────────────────────
    if (event === "tinder_profile_updated") {
      const props =
        properties as ServerEventPropertiesDefinition["tinder_profile_updated"];

      const [user, media] = await Promise.all([
        db.query.userTable.findFirst({
          where: eq(userTable.id, userId),
          columns: { name: true, email: true },
        }),
        db.query.mediaTable.findMany({
          where: eq(mediaTable.tinderProfileId, props.tinderId),
          columns: { url: true },
          limit: 3,
        }),
      ]);

      sendEvent({
        channel,
        emoji: "🔄",
        title: "Tinder Profile Updated",
        fields: {
          tinderId: props.tinderId,
          userName: user?.name ?? "Unknown",
          matches: props.matchCount,
          messages: props.messageCount,
          photos: props.photoCount,
          processingTimeMs: props.processingTimeMs,
          profileUrl: `https://swipestats.io/insights/${props.tinderId}`,
        },
        eventName: event,
        imageUrls: media
          .map((m) => m.url)
          .filter((url): url is string => !!url),
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Tinder Profile Upload Failed
    // ─────────────────────────────────────────────────
    if (event === "tinder_profile_upload_failed") {
      const props =
        properties as ServerEventPropertiesDefinition["tinder_profile_upload_failed"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendError({
        channel,
        title: "Tinder Upload Failed",
        error: props.errorMessage,
        context: {
          userId,
          userName: user?.name ?? "Unknown",
          tinderId: props.tinderId ?? "unknown",
          errorType: props.errorType,
          jsonSizeMB: props.jsonSizeMB ?? 0,
        },
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Hinge Profile Created
    // ─────────────────────────────────────────────────
    if (event === "hinge_profile_created") {
      const props =
        properties as ServerEventPropertiesDefinition["hinge_profile_created"];

      const [user, profile, media] = await Promise.all([
        db.query.userTable.findFirst({
          where: eq(userTable.id, userId),
          columns: { name: true, email: true },
        }),
        db.query.hingeProfileTable.findFirst({
          where: eq(hingeProfileTable.hingeId, props.hingeId),
          columns: {
            gender: true,
            hometowns: true,
          },
        }),
        db.query.mediaTable.findMany({
          where: eq(mediaTable.hingeProfileId, props.hingeId),
          columns: { url: true },
          limit: 5,
        }),
      ]);

      sendEvent({
        channel,
        emoji: "💜",
        title: "Hinge Profile Created",
        fields: {
          hingeId: props.hingeId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          gender: profile?.gender ?? undefined,
          hometowns: profile?.hometowns?.join(", ") ?? undefined,
          matches: props.matchCount,
          messages: props.messageCount,
          photos: props.photoCount,
          prompts: props.promptCount,
          interactions: props.interactionCount,
          processingTimeMs: props.processingTimeMs,
          profileUrl: `https://swipestats.io/insights/hinge/${props.hingeId}`,
        },
        eventName: event,
        imageUrls: media
          .map((m) => m.url)
          .filter((url): url is string => !!url),
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Hinge Profile Updated
    // ─────────────────────────────────────────────────
    if (event === "hinge_profile_updated") {
      const props =
        properties as ServerEventPropertiesDefinition["hinge_profile_updated"];

      const [user, media] = await Promise.all([
        db.query.userTable.findFirst({
          where: eq(userTable.id, userId),
          columns: { name: true, email: true },
        }),
        db.query.mediaTable.findMany({
          where: eq(mediaTable.hingeProfileId, props.hingeId),
          columns: { url: true },
          limit: 3,
        }),
      ]);

      sendEvent({
        channel,
        emoji: "🔄",
        title: "Hinge Profile Updated",
        fields: {
          hingeId: props.hingeId,
          userName: user?.name ?? "Unknown",
          matches: props.matchCount,
          messages: props.messageCount,
          photos: props.photoCount,
          prompts: props.promptCount,
          processingTimeMs: props.processingTimeMs,
          profileUrl: `https://swipestats.io/insights/hinge/${props.hingeId}`,
        },
        eventName: event,
        imageUrls: media
          .map((m) => m.url)
          .filter((url): url is string => !!url),
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Hinge Profile Upload Failed
    // ─────────────────────────────────────────────────
    if (event === "hinge_profile_upload_failed") {
      const props =
        properties as ServerEventPropertiesDefinition["hinge_profile_upload_failed"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendError({
        channel,
        title: "Hinge Upload Failed",
        error: props.errorMessage,
        context: {
          userId,
          userName: user?.name ?? "Unknown",
          hingeId: props.hingeId ?? "unknown",
          errorType: props.errorType,
          jsonSizeMB: props.jsonSizeMB ?? 0,
        },
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Subscription Activated
    // ─────────────────────────────────────────────────
    if (event === "subscription_activated") {
      const props =
        properties as ServerEventPropertiesDefinition["subscription_activated"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendEvent({
        channel: envSelect({
          prod: "sales" as const,
          test: "bot-developer" as const,
        }),
        emoji: "💰",
        title: "Subscription Activated",
        fields: {
          tier: props.tier,
          source: props.source,
          billingPeriod: props.billingPeriod ?? "unknown",
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          userId,
        },
        eventName: event,
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Subscription Cancelled
    // ─────────────────────────────────────────────────
    if (event === "subscription_cancelled") {
      const props =
        properties as ServerEventPropertiesDefinition["subscription_cancelled"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendEvent({
        channel: envSelect({
          prod: "sales" as const,
          test: "bot-developer" as const,
        }),
        emoji: "❌",
        title: "Subscription Cancelled",
        fields: {
          tier: props.tier,
          reason: props.reason,
          hadActiveSubscription: props.hadActiveSubscription,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          userId,
        },
        eventName: event,
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Billing Payment Successful (ALL payments including lifetime!)
    // ─────────────────────────────────────────────────
    if (event === "billing_payment_successful") {
      const props =
        properties as ServerEventPropertiesDefinition["billing_payment_successful"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      // Special emoji for lifetime purchases!
      const emoji = props.billingPeriod === "lifetime" ? "🎉" : "💰";
      const title =
        props.billingPeriod === "lifetime"
          ? "🚀 Lifetime Purchase!"
          : "Payment Successful";

      sendEvent({
        channel: envSelect({
          prod: "sales" as const,
          test: "bot-developer" as const,
        }),
        emoji,
        title,
        fields: {
          tier: props.tier,
          billingPeriod: props.billingPeriod,
          amount: `${props.currency.toUpperCase()} ${props.amount}`,
          orderId: props.orderId,
          subscriptionId: props.subscriptionId ?? "N/A (lifetime)",
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          userId,
        },
        eventName: event,
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Billing Payment Failed
    // ─────────────────────────────────────────────────
    if (event === "billing_payment_failed") {
      const props =
        properties as ServerEventPropertiesDefinition["billing_payment_failed"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendError({
        channel,
        title: "Payment Failed",
        error: props.errorMessage ?? "Payment processing failed",
        context: {
          userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "No email",
          subscriptionId: props.subscriptionId ?? "none",
          amount: props.amount,
          currency: props.currency,
          errorCode: props.errorCode ?? "unknown",
        },
      });
      return;
    }

    // ─────────────────────────────────────────────────
    // Comparison Created
    // ─────────────────────────────────────────────────
    if (event === "comparison_created") {
      const props =
        properties as ServerEventPropertiesDefinition["comparison_created"];

      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { name: true, email: true },
      });

      sendEvent({
        channel,
        emoji: "🆚",
        title: "Comparison Created",
        fields: {
          comparisonId: props.comparisonId,
          columnCount: props.columnCount,
          hasCustomPhotos: props.hasCustomPhotos,
          userName: user?.name ?? "Unknown",
          comparisonUrl: `https://swipestats.io/compare/${props.comparisonId}`,
        },
        eventName: event,
      });
      return;
    }
  } catch (error) {
    // Don't let Slack failures break analytics pipeline
    console.error(
      "[Slack] Error in analytics provider:",
      event,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
