"use client";

import { useState } from "react";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import {
  SWIPESTATS_PRICING,
  TIER_FEATURES,
  type BillingPeriod,
} from "@/lib/constants/pricing";
import { useSubscription } from "@/hooks/useSubscription";
import { SwipestatsPlanUpgradeModal } from "@/app/app/components/SwipestatsPlanUpgradeModal";

/**
 * Upgrade card for the insights page promoting SwipeStats Plus/Elite
 * Takes the place of the ActivityPatterns component in Row 3
 */
export function InsightsUpgradeCard() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] =
    useState<BillingPeriod>("lifetime");
  const { effectiveTier, isLifetime, periodEnd } = useSubscription();

  // Determine which tier to show based on current subscription
  const displayTier = effectiveTier === "FREE" ? "PLUS" : "ELITE";
  const isElite = effectiveTier === "ELITE";

  // If ELITE, show status card
  if (isElite) {
    return (
      <Card className="border-2 border-amber-200 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-lg transition-all hover:shadow-xl dark:border-amber-700 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-500 shadow-lg">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">
                You&apos;re on SwipeStats Elite
              </h3>
              <p className="text-muted-foreground mt-2">
                {isLifetime
                  ? "Lifetime access - You have the best plan!"
                  : periodEnd
                    ? `Active until ${new Date(periodEnd).toLocaleDateString()}`
                    : "You have access to all features"}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 dark:bg-amber-950/50">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Top Tier Unlocked
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const features = TIER_FEATURES[displayTier];
  const pricing = SWIPESTATS_PRICING[displayTier];

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border-2 shadow-lg transition-all hover:shadow-xl",
          displayTier === "PLUS"
            ? "border-pink-200 bg-linear-to-br from-pink-50 via-rose-50 to-purple-50 dark:border-pink-700 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-purple-950/20"
            : "border-amber-200 bg-linear-to-br from-amber-50 via-orange-50 to-yellow-50 dark:border-amber-700 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20",
        )}
      >
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            {/* Left section - Features */}
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-3">
                {displayTier === "PLUS" ? (
                  <Sparkles className="h-6 w-6 text-pink-600" />
                ) : (
                  <Crown className="h-6 w-6 text-amber-600" />
                )}
                <h3 className="text-2xl font-bold tracking-tight">
                  SwipeStats {displayTier === "PLUS" ? "Plus" : "Elite"}
                </h3>
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                {displayTier === "PLUS"
                  ? "Perfect for serious daters who want deeper insights"
                  : "Ultimate insights with AI-powered message intelligence"}
              </p>

              {/* Features */}
              <div className="mb-4 flex items-center gap-x-4">
                <h4 className="flex-none text-sm font-semibold text-pink-600 dark:text-pink-400">
                  What&apos;s included
                </h4>
                <div className="h-px flex-auto bg-gray-200 dark:bg-gray-700" />
              </div>

              <ul className="grid gap-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check
                      className={cn(
                        "mt-0.5 h-5 w-5 flex-shrink-0",
                        displayTier === "PLUS"
                          ? "text-pink-600"
                          : "text-amber-600",
                      )}
                    />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right section - Pricing */}
            <div>
              <div className="rounded-2xl bg-white/50 p-6 text-center shadow-sm backdrop-blur-sm dark:bg-gray-900/50">
                {/* Billing period toggle */}
                <div className="mb-4 inline-flex rounded-lg bg-gray-200 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setSelectedPeriod("monthly")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      selectedPeriod === "monthly"
                        ? "bg-white shadow-sm dark:bg-gray-700"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSelectedPeriod("lifetime")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      selectedPeriod === "lifetime"
                        ? "bg-white shadow-sm dark:bg-gray-700"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Lifetime
                  </button>
                </div>

                <p className="text-muted-foreground mb-2 text-xs font-semibold">
                  Pay once, own it forever
                </p>

                <div className="mb-4 flex items-baseline justify-center gap-x-2">
                  <span className="text-4xl font-bold tracking-tight">
                    ${pricing[selectedPeriod]}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">
                    {selectedPeriod === "monthly" ? "/mo" : "USD"}
                  </span>
                </div>

                <Button
                  onClick={() => setUpgradeModalOpen(true)}
                  className={cn(
                    "w-full font-semibold shadow-sm",
                    displayTier === "PLUS"
                      ? "bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                      : "bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700",
                  )}
                >
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-muted-foreground mt-4 text-xs">
                  {selectedPeriod === "lifetime"
                    ? "One-time payment, no recurring charges"
                    : "Cancel anytime. Secure payment by LemonSqueezy"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <SwipestatsPlanUpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </>
  );
}
