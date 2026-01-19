import { render } from "@react-email/components";

import { EmailVerificationInline } from "../../../emails/EmailVerificationInline";
import { resend } from "@/server/clients/resend.client";

/**
 * Send verification email to user
 * @param email - User's email address
 * @param verificationUrl - URL with verification token
 * @returns Object with success status and optional message
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
): Promise<{ success: boolean; message?: string }> {
  // Skip anonymous emails
  if (email.includes("@anonymous.swipestats.io")) {
    console.log(
      `[Email] Skipping verification email for anonymous address: ${email}`,
    );
    return { success: false, message: "Cannot send to anonymous email" };
  }

  try {
    // Render the email template
    const emailHtml = await render(
      EmailVerificationInline({ verificationUrl }),
    );

    // Send via Resend
    const result = await resend.emails.send({
      from: "SwipeStats <noreply@mail.swipestats.io>",
      to: email,
      subject: "Verify your email address",
      html: emailHtml,
    });

    console.log(`[Email] Verification email sent to ${email}`, result);

    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    console.error(
      `[Email] Failed to send verification email to ${email}:`,
      error,
    );
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
