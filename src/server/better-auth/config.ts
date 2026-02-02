import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { render } from "@react-email/components";

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { trackServerEvent } from "@/server/services/analytics.service";
import { EmailVerificationInline } from "../../../emails/EmailVerificationInline";
import { resend } from "@/server/clients/resend.client";

export const auth = betterAuth({
  // Base URL for generating verification links and OAuth redirects
  baseURL: env.NEXT_PUBLIC_BASE_URL,
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
    // Don't require email verification - allows anonymous conversions to work
    // and lets users with unverified emails still sign in
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Skip anonymous emails
      if (user.email.includes("@anonymous.swipestats.io")) {
        console.log(
          `[Email] Skipping verification email for anonymous address: ${user.email}`,
        );
        return;
      }

      try {
        // Render the email template
        const emailHtml = await render(
          EmailVerificationInline({ verificationUrl: url }),
        );

        // Send via Resend
        await resend.emails.send({
          from: "SwipeStats <noreply@mail.swipestats.io>",
          to: user.email,
          subject: "Verify your email address",
          html: emailHtml,
        });

        console.log(`[Email] Verification email sent to ${user.email}`);
      } catch (error) {
        console.error(
          `[Email] Failed to send verification email to ${user.email}:`,
          error,
        );
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
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
  // ─────────────────────────────────────────────────
  // Endpoint Hooks - Access to request context
  // ─────────────────────────────────────────────────
  // Use hooks.after when you need access to request context (headers, query params, etc.)
  // that isn't available in databaseHooks. This runs as part of the auth flow,
  // so there's no additional performance overhead.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only handle anonymous sign-in endpoint (early return for all other endpoints)
      if (ctx.path !== "/sign-in/anonymous") return;

      const newSession = ctx.context.newSession;
      if (!newSession?.user) return;

      // Read source from custom header (passed from client via fetchOptions)
      // This lets us track where anonymous users are coming from for analytics
      const sourceHeader = ctx.headers?.get("x-anonymous-source");
      const source =
        sourceHeader === "upload_flow" || sourceHeader === "comparison_view"
          ? sourceHeader
          : "direct";

      // Track anonymous user creation with specific source
      if (newSession.user.isAnonymous) {
        console.log(
          `[Auth] Anonymous user created: ${newSession.user.id} (source: ${source})`,
        );
        trackServerEvent(newSession.user.id, "anonymous_user_created", {
          source,
        });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-verify anonymous emails
          // Anonymous emails can't receive verification emails, so we mark them as verified
          // This allows converted anonymous users (with username + password) to sign in
          if (user.email?.includes("@anonymous.swipestats.io")) {
            return {
              data: {
                ...user,
                emailVerified: true,
              },
            };
          }
          return { data: user };
        },
        after: async (user) => {
          try {
            // Anonymous users are tracked in hooks.after (where we have request context)
            if (user.isAnonymous) {
              console.log("[Auth] Anonymous user created:", user.id);
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
      delete: {
        after: async (session) => {
          try {
            console.log("[Auth] Session deleted:", session.userId);
            // Don't track sign-outs - they're often automatic cleanup (anonymous conversions, expiry)
            // rather than explicit user actions. If needed, track sign-outs at the application level
            // where you have more context about whether it's user-initiated.
          } catch (error) {
            console.error("[Auth] Error in session.delete.after hook:", error);
          }
        },
      },
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://swipestats-42.beta.localcan.dev",
    "https://swipestats-4-beta.vercel.app",

    // Add production domains here when deploying
    "https://swipestats.io",
  ],
  plugins: [
    username({
      usernameValidator: (username) => {
        // Prevent @ symbols to avoid confusion with email sign-in
        if (username.includes("@")) {
          return false;
        }
        return true;
      },
    }),
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
