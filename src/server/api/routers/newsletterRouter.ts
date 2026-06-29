import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  createContact,
  sendEmailPreferencesEmail,
  subscribeToTopics,
  setTopicSubscriptions,
  getContactTopicSubscriptions,
  unsubscribeFromTopics,
} from "@/server/clients/resend.client";
import { topicKeySchema, emailSchema } from "@/lib/validators";
import { isAnonymousEmail } from "@/lib/utils/auth";
import {
  createAppToken,
  normalizeAppTokenSubject,
  validateAppToken,
} from "@/server/services/app-token.service";

const PREFERENCE_TOKEN_TTL_SECONDS = 60 * 60 * 24;
const UNSUBSCRIBE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;
const genericPreferenceMessage =
  "If that email can receive SwipeStats updates, we'll send a preferences link.";

function buildEmailPreferencesUrl(token: string) {
  return `${env.NEXT_PUBLIC_BASE_URL}/email-preferences?token=${encodeURIComponent(token)}`;
}

function buildUnsubscribeUrl(token: string) {
  return `${env.NEXT_PUBLIC_BASE_URL}/email-preferences/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function createNewsletterUnsubscribeUrl(input: {
  email: string;
  topic?: z.infer<typeof topicKeySchema>;
}) {
  const { rawToken } = await createAppToken({
    purpose: "unsubscribe",
    subject: input.email,
    expiresInSeconds: UNSUBSCRIBE_TOKEN_TTL_SECONDS,
    metadata: input.topic ? { topic: input.topic } : { scope: "all" },
  });

  return buildUnsubscribeUrl(rawToken);
}

export const newsletterRouter = createTRPCRouter({
  subscribe: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        path: z.string().optional(),
        topic: topicKeySchema.optional(), // Single topic
      }),
    )
    .mutation(async ({ input }) => {
      const { email, path, topic } = input;

      // Skip anonymous emails
      if (isAnonymousEmail(email)) {
        return {
          success: false,
          message: "Cannot subscribe anonymous email",
        };
      }

      try {
        // Create contact in Resend (idempotent)
        const contactResult = await createContact({ email });

        if (!contactResult.success) {
          throw new Error(contactResult.error || "Failed to create contact");
        }

        // Subscribe to topic if specified
        if (topic) {
          const topicResult = await subscribeToTopics({
            email,
            topics: [topic],
          });

          if (!topicResult.success) {
            console.warn(
              `Failed to subscribe to topic ${topic}:`,
              topicResult.error,
            );
            // Don't fail the whole operation if topic subscription fails
          }
        }

        // Log for analytics
        console.log("Newsletter subscription:", {
          email,
          path,
          topic,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: "Successfully subscribed!",
        };
      } catch (error) {
        console.error("Newsletter subscription error:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Subscription failed",
        };
      }
    }),

  requestPreferenceLink: publicProcedure
    .input(z.object({ email: emailSchema }))
    .mutation(async ({ input, ctx }) => {
      const email = normalizeAppTokenSubject(input.email);

      if (isAnonymousEmail(email)) {
        return { success: true, message: genericPreferenceMessage };
      }

      try {
        const { rawToken } = await createAppToken({
          purpose: "email_preferences",
          subject: email,
          expiresInSeconds: PREFERENCE_TOKEN_TTL_SECONDS,
          createdBy: ctx.session?.user?.id,
        });

        await sendEmailPreferencesEmail(
          email,
          buildEmailPreferencesUrl(rawToken),
        );
      } catch (error) {
        console.error("Failed to send preference link:", error);
      }

      return { success: true, message: genericPreferenceMessage };
    }),

  getPreferencesByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const token = await validateAppToken({
        token: input.token,
        purpose: "email_preferences",
      });

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This preferences link is invalid or expired.",
        });
      }

      const result = await getContactTopicSubscriptions({
        email: token.subject,
      });

      return {
        email: token.subject,
        topics: result.success ? (result.topics ?? []) : [],
      };
    }),

  updatePreferencesByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        topics: z.array(topicKeySchema),
      }),
    )
    .mutation(async ({ input }) => {
      const token = await validateAppToken({
        token: input.token,
        purpose: "email_preferences",
      });

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This preferences link is invalid or expired.",
        });
      }

      const result = await setTopicSubscriptions({
        email: token.subject,
        topics: input.topics,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to update preferences.",
        });
      }

      return { success: true, message: "Preferences updated." };
    }),

  unsubscribeByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const token = await validateAppToken({
        token: input.token,
        purpose: "unsubscribe",
        allowUsed: true,
      });

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This unsubscribe link is invalid or expired.",
        });
      }

      const metadata = token.metadata as Record<string, unknown>;
      const topic = topicKeySchema.safeParse(metadata.topic);
      const topics = topic.success ? [topic.data] : [];

      const result =
        topics.length > 0
          ? await unsubscribeFromTopics({ email: token.subject, topics })
          : await setTopicSubscriptions({ email: token.subject, topics: [] });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to unsubscribe.",
        });
      }

      return {
        success: true,
        email: token.subject,
        topic: topic.success ? topic.data : null,
      };
    }),

  /**
   * Get newsletter topic subscriptions for the signed-in user's email only.
   */
  getMyTopics: publicProcedure
    .input(
      z
        .object({
          email: z.string().email().optional(), // Optional email for anonymous users
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const sessionEmail = ctx.session?.user?.email;

      if (!sessionEmail) {
        return {
          isSubscribed: false,
          topics: [],
        };
      }

      const email = normalizeAppTokenSubject(sessionEmail);

      if (input?.email && normalizeAppTokenSubject(input.email) !== email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Skip anonymous email domains
      if (isAnonymousEmail(email)) {
        return {
          isSubscribed: false,
          topics: [],
        };
      }

      try {
        const result = await getContactTopicSubscriptions({ email });

        if (!result.success) {
          return {
            isSubscribed: false,
            topics: [],
          };
        }

        return {
          isSubscribed: true,
          email,
          topics: result.topics || [],
        };
      } catch (error) {
        console.error("Failed to get user topics:", error);
        return {
          isSubscribed: false,
          topics: [],
        };
      }
    }),

  /**
   * Update topic subscriptions for the signed-in user's email only.
   */
  updateMyTopics: publicProcedure
    .input(
      z.object({
        topics: z.array(topicKeySchema),
        email: z.string().email().optional(), // Optional email for anonymous users
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sessionEmail = ctx.session?.user?.email;

      if (!sessionEmail) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const email = normalizeAppTokenSubject(sessionEmail);

      if (input.email && normalizeAppTokenSubject(input.email) !== email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Skip anonymous email domains
      if (isAnonymousEmail(email)) {
        throw new Error("Cannot update topics for anonymous email");
      }

      try {
        const result = await setTopicSubscriptions({
          email,
          topics: input.topics,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update topics");
        }

        return {
          success: true,
          message: "Topics updated successfully",
        };
      } catch (error) {
        console.error("Failed to update user topics:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to update topics",
        );
      }
    }),
});
