import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";

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

        // Import and call the transfer service
        const { transferAnonymousUserData } =
          await import("@/server/services/anonymous.service");

        await transferAnonymousUserData(anonymousUser.user.id, newUser.user.id);

        console.log(`[Auth] Data transfer completed successfully`);
      },
    }),
    // Next.js cookie helper - MUST be last plugin in array
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
