import * as React from "react";
import { Body, Container, Head, Html, Preview } from "@react-email/components";

interface EmailLayoutInlineProps {
  preview?: string;
  children: React.ReactNode;
}

export const EmailLayoutInline = ({
  preview = "SwipeStats",
  children,
}: EmailLayoutInlineProps) => {
  return (
    <Html>
      <Head>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
          `}
        </style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f9fafb",
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            margin: "40px auto",
            maxWidth: "576px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
};
