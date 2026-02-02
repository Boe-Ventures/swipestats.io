import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createContact,
  subscribeToTopics,
  getContactTopicSubscriptions,
} from "@/server/clients/resend.client";
import { topicKeySchema, emailSchema } from "@/lib/validators";

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
      if (email.includes("@anonymous.swipestats.io")) {
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

  /**
   * Get newsletter topic subscriptions
   * For authenticated users: uses session email
   * For anonymous users: requires email parameter (from localStorage)
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
      // Determine which email to use:
      // 1. If provided in input, use that (for anonymous users with localStorage email)
      // 2. Otherwise, use session email (for authenticated users)
      const email = input?.email || ctx.session?.user?.email;

      if (!email) {
        return {
          isSubscribed: false,
          topics: [],
        };
      }

      // Skip anonymous email domains
      if (email.includes("@anonymous.swipestats.io")) {
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
   * Update topic subscriptions
   * For authenticated users: uses session email
   * For anonymous users: requires email parameter (from localStorage)
   */
  updateMyTopics: publicProcedure
    .input(
      z.object({
        topics: z.array(topicKeySchema),
        email: z.string().email().optional(), // Optional email for anonymous users
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Determine which email to use:
      // 1. If provided in input, use that (for anonymous users with localStorage email)
      // 2. Otherwise, use session email (for authenticated users)
      const email = input.email || ctx.session?.user?.email;

      if (!email) {
        throw new Error("No email found for user");
      }

      // Skip anonymous email domains
      if (email.includes("@anonymous.swipestats.io")) {
        throw new Error("Cannot update topics for anonymous email");
      }

      try {
        const result = await subscribeToTopics({
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
