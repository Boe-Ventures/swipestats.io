import * as React from "react";
import { Link } from "@react-email/components";

import { EmailLayoutInline } from "./components/EmailLayoutInline";

interface EmailPreferencesInlineProps {
  preferencesUrl: string;
}

export const EmailPreferencesInline = ({
  preferencesUrl = "https://swipestats.io/email-preferences?token=abc123",
}: EmailPreferencesInlineProps) => {
  return (
    <EmailLayoutInline preview="Manage your SwipeStats email preferences">
      <h1 style={h1}>Manage your email preferences</h1>

      <p style={text}>
        Use this secure link to choose which SwipeStats updates and waitlist
        notifications you receive. It only works for this email address.
      </p>

      <div style={{ margin: "32px 0" }}>
        <Link href={preferencesUrl} style={button}>
          Open preferences
        </Link>
      </div>

      <p style={text}>
        If you did not request this email, you can safely ignore it.
      </p>

      <p style={smallText}>
        This preferences link expires in 24 hours.
      </p>
    </EmailLayoutInline>
  );
};

export default EmailPreferencesInline;

const h1 = {
  color: "#111827",
  fontSize: "30px",
  fontWeight: 600,
  lineHeight: "1.2",
  margin: "0 0 24px 0",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const button = {
  backgroundColor: "#e11d48",
  borderRadius: "8px",
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: 600,
  padding: "12px 24px",
  textAlign: "center" as const,
  textDecoration: "none",
};

const smallText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: 0,
};
