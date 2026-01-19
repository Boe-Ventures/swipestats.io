import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";

import { eq, desc, and } from "drizzle-orm";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
  verificationTable,
} from "@/server/db/schema";
import { protectedProcedure } from "../trpc";
import type { TRPCRouterRecord } from "@trpc/server";
import { sendVerificationEmail } from "@/server/services/email.service";
import { env } from "@/env";

export const userRouter = {
  // Get current user profile
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, ctx.session.user.id),
    });
  }),

  // Update profile (name, displayUsername)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        displayUsername: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update dating apps activity
  updateDatingApps: protectedProcedure
    .input(
      z.object({
        activeOnTinder: z.boolean().optional(),
        activeOnHinge: z.boolean().optional(),
        activeOnBumble: z.boolean().optional(),
        activeOnHappn: z.boolean().optional(),
        activeOnOther: z.boolean().optional(),
        otherDatingApps: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update self-assessment (hotness/happiness)
  updateSelfAssessment: protectedProcedure
    .input(
      z.object({
        currentHotness: z.number().min(1).max(10).optional(),
        currentHappiness: z.number().min(1).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Update location (timezone, country)
  updateLocation: protectedProcedure
    .input(
      z.object({
        timeZone: z.string().min(1).max(100).optional(),
        country: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set(input)
        .where(eq(userTable.id, ctx.session.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Delete user account
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user info before deletion
    const userToDelete = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!userToDelete) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Delete user (cascade will handle related records)
    await ctx.db.delete(userTable).where(eq(userTable.id, userId));

    return { success: true, deletedUserId: userId };
  }),

  // Get user's uploaded profiles (Tinder and Hinge)
  getUploadedProfiles: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Fetch both Tinder and Hinge profiles
    const [tinderProfiles, hingeProfiles] = await Promise.all([
      ctx.db.query.tinderProfileTable.findMany({
        where: eq(tinderProfileTable.userId, userId),
        columns: {
          tinderId: true,
          createdAt: true,
          updatedAt: true,
          ageAtUpload: true,
          gender: true,
          city: true,
          country: true,
          firstDayOnApp: true,
          lastDayOnApp: true,
          daysInProfilePeriod: true,
        },
        with: {
          profileMeta: {
            columns: {
              matchesTotal: true,
              swipeLikesTotal: true,
              swipePassesTotal: true,
              messagesSentTotal: true,
              messagesReceivedTotal: true,
              matchRate: true,
            },
            limit: 1,
            orderBy: (profileMeta) => [desc(profileMeta.to)],
          },
        },
        orderBy: [desc(tinderProfileTable.updatedAt)],
      }),
      ctx.db.query.hingeProfileTable.findMany({
        where: eq(hingeProfileTable.userId, userId),
        columns: {
          hingeId: true,
          createdAt: true,
          updatedAt: true,
          ageAtUpload: true,
          gender: true,
          country: true,
          createDate: true,
        },
        with: {
          profileMeta: {
            columns: {
              matchesTotal: true,
              swipeLikesTotal: true,
              swipePassesTotal: true,
              messagesSentTotal: true,
              messagesReceivedTotal: true,
            },
            limit: 1,
            orderBy: (profileMeta) => [desc(profileMeta.to)],
          },
        },
        orderBy: [desc(hingeProfileTable.updatedAt)],
      }),
    ]);

    return {
      tinder: tinderProfiles.map((profile) => ({
        ...profile,
        type: "tinder" as const,
        stats: profile.profileMeta?.[0] ?? null,
      })),
      hinge: hingeProfiles.map((profile) => ({
        ...profile,
        type: "hinge" as const,
        stats: profile.profileMeta?.[0] ?? null,
      })),
    };
  }),

  // Update user email
  updateEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: In production, require re-authentication or password confirmation
      const userId = ctx.session.user.id;

      console.log(`[Email] User ${userId} updating email to ${input.email}`);

      // Update email and reset verification status
      const [updatedUser] = await ctx.db
        .update(userTable)
        .set({
          email: input.email,
          emailVerified: false, // Reset verification when changing email
        })
        .where(eq(userTable.id, userId))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      console.log(`[Email] Email updated, verification required`);

      // Automatically send verification email if new email is not anonymous
      if (!input.email.includes("@anonymous.swipestats.io")) {
        // Generate secure random token
        const token = randomBytes(32).toString("hex");
        const hashedToken = createHash("sha256").update(token).digest("hex");

        // Delete any existing verification tokens for this email
        await ctx.db
          .delete(verificationTable)
          .where(eq(verificationTable.identifier, input.email));

        // Store hashed token with 24 hour expiry
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await ctx.db.insert(verificationTable).values({
          id: randomBytes(16).toString("hex"),
          identifier: input.email,
          value: hashedToken,
          expiresAt,
        });

        // Build verification URL
        const baseUrl = env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

        // Send email (don't fail the update if email sending fails)
        const emailResult = await sendVerificationEmail(input.email, verifyUrl);

        if (emailResult.success) {
          console.log(
            `[Email] Verification email sent to new address: ${input.email}`,
          );
        } else {
          console.warn(
            `[Email] Failed to send verification email:`,
            emailResult.message,
          );
        }
      }

      return updatedUser;
    }),

  // Send verification email
  sendVerificationEmail: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Skip if email is anonymous or null
    if (!user.email || user.email.includes("@anonymous.swipestats.io")) {
      return {
        success: false,
        message: "Please update to a real email address first",
      };
    }

    // Generate secure random token (64 characters)
    const token = randomBytes(32).toString("hex");

    // Hash token before storing (SHA-256)
    const hashedToken = createHash("sha256").update(token).digest("hex");

    // Delete any existing verification tokens for this email (already checked user.email is not null)
    await ctx.db
      .delete(verificationTable)
      .where(eq(verificationTable.identifier, user.email));

    // Store hashed token in database with 24 hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await ctx.db.insert(verificationTable).values({
      id: randomBytes(16).toString("hex"),
      identifier: user.email,
      value: hashedToken,
      expiresAt,
    });

    // Build verification URL with unhashed token
    const baseUrl = env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    // Send email via Resend (already checked user.email is not null)
    const emailResult = await sendVerificationEmail(user.email, verifyUrl);

    if (!emailResult.success) {
      console.warn(
        `[Email] Failed to send verification email:`,
        emailResult.message,
      );
      return {
        success: false,
        message: emailResult.message || "Failed to send verification email",
      };
    }

    console.log(`[Email] Verification email sent to ${user.email}`);

    return {
      success: true,
      message: "Verification email sent! Check your inbox.",
    };
  }),

  // Verify email token
  verifyEmail: protectedProcedure
    .input(
      z.object({
        token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
      });

      if (!user?.email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found or email not set",
        });
      }

      // Hash the provided token to look it up
      const hashedToken = createHash("sha256")
        .update(input.token)
        .digest("hex");

      // Look up token in verification table
      const verification = await ctx.db.query.verificationTable.findFirst({
        where: and(
          eq(verificationTable.identifier, user.email),
          eq(verificationTable.value, hashedToken),
        ),
      });

      if (!verification) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or already used verification token",
        });
      }

      // Check if token is expired
      if (verification.expiresAt < new Date()) {
        // Delete expired token
        await ctx.db
          .delete(verificationTable)
          .where(eq(verificationTable.id, verification.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verification token has expired. Please request a new one.",
        });
      }

      // Token is valid - update user and delete token (one-time use)
      await Promise.all([
        ctx.db
          .update(userTable)
          .set({ emailVerified: true })
          .where(eq(userTable.id, userId)),
        ctx.db
          .delete(verificationTable)
          .where(eq(verificationTable.id, verification.id)),
      ]);

      console.log(
        `[Email] User ${userId} successfully verified email: ${user.email}`,
      );

      return {
        success: true,
        message: "Email verified successfully!",
      };
    }),
} satisfies TRPCRouterRecord;
