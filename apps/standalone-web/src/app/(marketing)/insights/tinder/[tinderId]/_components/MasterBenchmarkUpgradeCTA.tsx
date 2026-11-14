"use client";

import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpgrade } from "@/contexts/UpgradeContext";

/**
 * Simple upgrade CTA for the "How You Compare" section
 * Kept minimal since SwipestatsPlusCard is right above it
 */
export function MasterBenchmarkUpgradeCTA() {
  const { openUpgradeModal } = useUpgrade();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-pink-200 bg-pink-50/50 p-8 text-center dark:border-pink-800 dark:bg-pink-950/20">
      <p className="text-muted-foreground">
        Upgrade to Plus to see how you compare to other users
      </p>
      <Button
        onClick={() =>
          openUpgradeModal({
            tier: "PLUS",
            feature: "How You Compare",
          })
        }
        variant="outline"
        className="gap-2"
      >
        <Crown className="h-4 w-4" />
        Upgrade to Plus
      </Button>
    </div>
  );
}
