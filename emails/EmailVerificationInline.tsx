import * as React from "react";
import { Link } from "@react-email/components";

import { EmailLayoutInline } from "./components/EmailLayoutInline";

interface EmailVerificationInlineProps {
  verificationUrl: string;
}

export const EmailVerificationInline = ({
  verificationUrl = "https://swipestats.io/verify-email?token=abc123",
}: EmailVerificationInlineProps) => {
  return (
    <EmailLayoutInline preview="Verify your email address to unlock all SwipeStats features">
      <h1
        style={{
          marginBottom: "24px",
          fontSize: "30px",
          fontWeight: 600,
          color: "#111827",
          lineHeight: "1.2",
          margin: "0 0 24px 0",
        }}
      >
        Verify your email address
      </h1>

      <p
        style={{
          marginBottom: "16px",
          fontSize: "16px",
          lineHeight: "24px",
          color: "#374151",
          margin: "0 0 16px 0",
        }}
      >
        Thanks for upgrading your SwipeStats account! Please verify your email
        address to enable password reset and secure your account.
      </p>

      <div style={{ margin: "32px 0" }}>
        <Link
          href={verificationUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#e11d48",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 600,
            textAlign: "center",
            textDecoration: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          Verify Email Address
        </Link>
      </div>

      <p
        style={{
          marginBottom: "16px",
          fontSize: "16px",
          lineHeight: "24px",
          color: "#374151",
          margin: "0 0 16px 0",
        }}
      >
        If you didn't request this verification email, you can safely ignore it.
      </p>

      <p
        style={{
          fontSize: "14px",
          color: "#6b7280",
          margin: 0,
        }}
      >
        This verification link will expire in 24 hours for security reasons.
      </p>
    </EmailLayoutInline>
  );
};

export default EmailVerificationInline;
