"use client";

import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";
import { toast } from "sonner";

import { useTheme } from "./theme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
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
