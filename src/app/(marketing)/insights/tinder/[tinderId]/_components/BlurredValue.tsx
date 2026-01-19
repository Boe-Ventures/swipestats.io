"use client";

import type { SwipestatsTier } from "@/server/db/schema";

interface BlurredValueProps {
  children: React.ReactNode;
  tier: "account" | "plus";
  userIsAnonymous: boolean;
  userTier: SwipestatsTier;
  className?: string;
}

/**
 * Blurred value component with two-tier system:
 * - "account": Requires sign up (shown to anonymous users)
 * - "plus": Requires SwipeStats Plus subscription
 */
export function BlurredValue({
  children,
  tier,
  userIsAnonymous,
  userTier,
  className = "",
}: BlurredValueProps) {
  // Determine if value should be blurred
  const shouldBlur =
    (tier === "account" && userIsAnonymous) ||
    (tier === "plus" && userTier === "FREE");

  if (!shouldBlur) {
    return <>{children}</>;
  }

  const badgeText = tier === "account" ? "Sign Up" : "Plus";
  const badgeColor =
    tier === "account"
      ? "bg-blue-500/90 text-white"
      : "bg-gradient-to-r from-pink-500 to-orange-500 text-white";

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="blur-sm select-none">{children}</span>
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold shadow-sm ${badgeColor}`}
        >
          {badgeText}
        </span>
      </span>
    </span>
  );
}
