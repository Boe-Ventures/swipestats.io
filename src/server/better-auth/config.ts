import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { render } from "@react-email/components";

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
  aliasServerUser,
  trackServerEvent,
} from "@/server/services/analytics.service";
import {
  ANONYMOUS_SOURCES,
  type AnonymousSource,
} from "@/lib/analytics/analytics.types";
import { EmailVerificationInline } from "../../../emails/EmailVerificationInline";
import { resend } from "@/server/clients/resend.client";

const developmentTrustedOrigins =
  env.NODE_ENV === "development"
    ? [
        // Direct Next.js dev servers on any available loopback port.
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",

        // Portless uses stable HTTPS names such as swipestats.localhost and
        // branch-name.swipestats.localhost for linked worktrees.
        "http://*.localhost",
        "https://*.localhost",

        // MCP-managed LocalCan public development tunnel.
        "https://*.local",
        "https://swipestats-*.localcan.dev",
        "https://swipestats.localcan.dev",
      ]
    : [];

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
        const result = await resend.emails.send({
          from: "SwipeStats <noreply@mail.swipestats.io>",
          to: user.email,
          subject: "Verify your email address",
          html: emailHtml,
        });

        // Check if there was an error
        if (result.error) {
          console.error(
            `[Email] Failed to send verification email to ${user.email}:`,
            result.error,
          );
          return;
        }

        console.log(
          `[Email] Verification email sent to ${user.email} (ID: ${result.data?.id})`,
        );
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
      // Granular analytics consent (jsonb mirror of the cookie choice) — rides
      // the per-request session so procedures read it without an extra query.
      // input:false — only consentRouter writes it. (Read via readConsent(),
      // which isolates the better-auth json-inference cast — #5900.)
      analyticsConsent: {
        type: "json",
        required: false,
        input: false,
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
      const newSession = ctx.context.newSession;
      if (!newSession?.user) return;

      if (ctx.path === "/sign-in/anonymous") {
        // Read source from custom header (passed from client via fetchOptions)
        // This lets us track where anonymous users are coming from for analytics.
        // Validated against the shared allowlist; anything else → "direct".
        const sourceHeader = ctx.headers?.get("x-anonymous-source");
        const source: AnonymousSource =
          sourceHeader &&
          (ANONYMOUS_SOURCES as readonly string[]).includes(sourceHeader)
            ? (sourceHeader as AnonymousSource)
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
        return;
      }

      // ── Why user_signed_in is tracked HERE, not in databaseHooks.session.create ──
      // Better Auth writes a session row in (at least) five flows:
      //   /sign-up/email           → autoSignIn (default true) signs users in on registration
      //   /sign-in/anonymous       → every guest visitor gets a user + session
      //   /verify-email            → autoSignInAfterVerification creates another session
      //   /admin/impersonate-user  → impersonation creates a session for the target user
      //   /sign-in/email|username  → an actual returning login
      // Only the last one means "a returning user signed in" (was logged out,
      // new device, expired session). Hooking session.create fired
      // user_signed_in for all five, inflating the metric ~25x (2026-07:
      // 666 "sign-ins" ≈ 531 anonymous guests + 110 sign-ups + ~25 genuine
      // logins). The endpoint path is the only reliable signal of intent — a
      // user-age check alone would still miscount delayed /verify-email
      // sessions and impersonation — so we filter on ctx.path, which is only
      // available in this middleware.
      // Note: sign-ins are rare by design (sessions are long-lived and refresh
      // on activity), so this event measures re-authentication, not engagement.
      if (ctx.path === "/sign-in/email" || ctx.path === "/sign-in/username") {
        trackServerEvent(newSession.user.id, "user_signed_in", {
          method: ctx.path === "/sign-in/username" ? "username" : "email",
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
      // user_signed_in is tracked in hooks.after (path-filtered) instead of
      // session.create — sessions are also created on sign-up, anonymous
      // sign-in, email verification, and impersonation, which are not sign-ins.
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
    ...developmentTrustedOrigins,
    // Trust all of THIS project's Vercel preview + per-deployment URLs. The
    // stable branch alias is already covered via baseURL (VERCEL_BRANCH_URL),
    // but the per-deployment hash URLs are not — this wildcard covers both.
    // better-auth's matchesOriginPattern supports `*`; scoped to `swipestats-*`
    // so we don't trust unrelated *.vercel.app apps. No baseURL change needed:
    // we use email/password only (no OAuth callbacks) and cookies are host-only.
    "https://swipestats-*.vercel.app",

    // Production
    "https://www.swipestats.io",
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

          // Merge the anonymous user's analytics history into the new account
          // (PostHog alias) so their pre-signup funnel attributes to them.
          aliasServerUser(anonymousUser.user.id, newUser.user.id);

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
