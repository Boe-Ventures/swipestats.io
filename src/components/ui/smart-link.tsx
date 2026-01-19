import { cn } from "./lib/utils";
import Link from "next/link";
import type * as React from "react";

function isExternalLink(href: string): boolean {
  // Check for protocol-relative URLs, absolute URLs, or special protocols
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("sms:")
  );
}

export interface SmartLinkProps {
  href: string;
  children: React.ReactNode;
  newTab?: boolean;
  className?: string;
  underline?: boolean;
}

/**
 * SmartLink - A unified link component that automatically handles internal vs external links
 * with consistent semantic styling.
 *
 * Features:
 * - Automatically detects external links (http, https, mailto, tel, sms)
 * - Uses semantic design tokens for consistent theming
 * - Adds security attributes (rel="noopener noreferrer") for external links
 * - Supports both Next.js Link (internal) and anchor tags (external)
 */
export function SmartLink({
  href,
  children,
  newTab = false,
  className,
  underline = true,
}: SmartLinkProps) {
  const isExternal = isExternalLink(href);
  const baseClassName = cn(
    "text-primary hover:text-primary/90 transition-colors",
    underline && "underline underline-offset-4",
    className,
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target={newTab ? "_blank" : "_self"}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={baseClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      className={baseClassName}
    >
      {children}
    </Link>
  );
}
