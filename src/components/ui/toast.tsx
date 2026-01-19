"use client";

import type { ToasterProps } from "sonner";
import { Toaster as Sonner, toast } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  // Default to "light" theme to avoid dependency on ThemeProvider
  // This allows Toaster to work in marketing/auth routes without ThemeProvider
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
