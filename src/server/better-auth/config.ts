import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { trackServerEvent } from "@/server/services/analytics.service";

export const auth = betterAuth({
  // Enable experimental joins for 2-3x performance improvement on session lookups
  experimental: {
    joins: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    // Explicit schema mapping for Better Auth
    // Note: Table names in DB are snake_case (user, session, account, verification)
    schema: {
      user: schema.userTable,
      session: schema.sessionTable,
      account: schema.accountTable,
      verification: schema.verificationTable,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // Subscription fields (from userTable schema)
      swipestatsTier: {
        type: "string",
        required: false,
        defaultValue: "FREE",
      },
      subscriptionProviderId: {
        type: "string",
        required: false,
        input: false, // Don't allow direct API input
      },
      subscriptionCurrentPeriodEnd: {
        type: "date",
        required: false,
        input: false,
      },
      isLifetime: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      // Location fields
      city: {
        type: "string",
        required: false,
      },
      country: {
        type: "string",
        required: false,
      },
      // add more?
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            // Skip external tracking for anonymous users (fake emails)
            // Track with a separate event for analytics funnel
            if (user.isAnonymous) {
              console.log("[Auth] Anonymous user created:", user.id);
              trackServerEvent(user.id, "anonymous_user_created", {
                source: "direct",
              });
              return;
            }

            // Track real user signup
            console.log("[Auth] User created:", user.id);
            trackServerEvent(user.id, "user_signed_up", {
              method: "email",
              email: user.email,
            });
          } catch (error) {
            console.error("[Auth] Error in user.create.after hook:", error);
            // Don't block user creation if tracking fails
          }
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          try {
            console.log("[Auth] Account created:", account.userId);
            trackServerEvent(
              account.userId,
              "user_account_created",
              account.password
                ? {
                    method: "email",
                  }
                : {
                    method: "oauth",
                    provider: account.providerId as "google",
                  },
            );
          } catch (error) {
            console.error("[Auth] Error in account.create.after hook:", error);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          try {
            console.log("[Auth] Session created:", session.userId);
            trackServerEvent(session.userId, "user_signed_in", {});
          } catch (error) {
            console.error("[Auth] Error in session.create.after hook:", error);
          }
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://swipestats-42.beta.localcan.dev",

    // Add production domains here when deploying
    "https://swipestats.io",
  ],
  plugins: [
    username(),
    admin({
      adminUserIds: [], // Add admin user IDs here when needed
      impersonationSessionDuration: 60 * 60, // 1 hour
    }),
    anonymous({
      emailDomainName: "anonymous.swipestats.io",
      generateName: () => `Guest-${crypto.randomUUID().slice(0, 8)}`,
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        console.log(
          `[Auth] Transferring data from anonymous user ${anonymousUser.user.id} to ${newUser.user.id}`,
        );

        try {
          // Import and call the transfer service
          const { transferAnonymousUserData } =
            await import("@/server/services/anonymous.service");

          const { hadProfile } = await transferAnonymousUserData(
            anonymousUser.user.id,
            newUser.user.id,
          );

          console.log(`[Auth] Data transfer completed successfully`);

          // Calculate days between anonymous user creation and conversion
          const anonCreatedAt = new Date(anonymousUser.user.createdAt);
          const conversionTime = new Date(newUser.user.createdAt);
          const daysSinceCreation = Math.floor(
            (conversionTime.getTime() - anonCreatedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          // Track the conversion event
          trackServerEvent(newUser.user.id, "anonymous_user_converted", {
            previousUserId: anonymousUser.user.id,
            hadProfile,
            daysSinceCreation,
          });

          console.log(
            `[Auth] Anonymous user ${anonymousUser.user.id} converted to ${newUser.user.id}`,
          );
        } catch (error) {
          console.error("[Auth] Error in onLinkAccount:", error);
          // Don't throw - Better Auth will still complete the conversion
        }
      },
    }),
    // Next.js cookie helper - MUST be last plugin in array
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
