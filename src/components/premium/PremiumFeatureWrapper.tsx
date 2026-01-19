"use client";

import React from "react";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { cn } from "@/components/ui/lib/utils";
import type { SwipestatsTier } from "@/lib/constants/pricing";

interface PremiumFeatureWrapperProps {
  requiredTier: SwipestatsTier;
  children: React.ReactNode;
  lockedContent?: React.ReactNode;
  upgradeTitle: string;
  upgradeDescription: string;
  blurIntensity?: "sm" | "md" | "lg";
  className?: string;
}

export function PremiumFeatureWrapper({
  requiredTier,
  children,
  lockedContent,
  upgradeTitle,
  upgradeDescription,
  blurIntensity = "sm",
  className,
}: PremiumFeatureWrapperProps) {
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();

  // Check if user has required access
  const hasAccess =
    effectiveTier === "ELITE" ||
    (requiredTier === "PLUS" && effectiveTier === "PLUS");

  // If user has access, just render children
  if (hasAccess) {
    return <>{children}</>;
  }

  const blurClasses = {
    sm: "blur-sm",
    md: "blur-md",
    lg: "blur-lg",
  };

  // Render locked state with overlay
  return (
    <div className={cn("relative", className)}>
      {/* Locked preview content */}
      <div
        className={cn(
          "pointer-events-none opacity-40 select-none",
          blurClasses[blurIntensity],
        )}
      >
        {lockedContent || children}
      </div>

      {/* Overlay with upgrade CTA */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg border bg-gradient-to-r from-pink-50 to-rose-50 p-6 shadow-lg dark:from-pink-950/50 dark:to-rose-950/50">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-md">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{upgradeTitle}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {upgradeDescription}
              </p>
            </div>
            <Button
              onClick={() => openUpgradeModal({ tier: requiredTier })}
              className={cn(
                "w-full font-semibold",
                "bg-gradient-to-r from-pink-600 to-rose-600",
                "hover:from-pink-700 hover:to-rose-700",
              )}
            >
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to {requiredTier === "PLUS" ? "Plus" : "Elite"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
