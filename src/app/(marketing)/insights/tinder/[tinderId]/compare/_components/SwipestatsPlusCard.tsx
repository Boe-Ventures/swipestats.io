"use client";

import {
  Check,
  Crown,
  Sparkles,
  Loader2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/components/ui";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  SWIPESTATS_PRICING,
  TIER_FEATURES,
  type BillingPeriod,
} from "@/lib/constants/pricing";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export function SwipestatsPlusCard({
  className,
  tinderId,
}: {
  className?: string;
  tinderId?: string;
}) {
  const { effectiveTier } = useSubscription();
  const trpc = useTRPC();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] =
    useState<BillingPeriod>("lifetime");

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";
  const pricing = SWIPESTATS_PRICING.PLUS;

  const createCheckoutMutation = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.assign(data.checkoutUrl);
      },
      onError: (error) => {
        console.error("Failed to create checkout:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to create checkout. Please try again.",
        );
        setIsProcessing(false);
      },
    }),
  );

  const handleUpgrade = () => {
    setError(null);
    setIsProcessing(true);
    createCheckoutMutation.mutate({
      tier: "PLUS",
      billingPeriod: selectedPeriod,
    });
  };

  // Premium user welcome card
  if (hasPremiumAccess) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 p-8 shadow-lg ring-1 ring-gray-200",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900">
              Welcome to SwipeStats+
            </h3>
            <p className="text-muted-foreground mt-2 text-base">
              You now have full access to all premium features
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {TIER_FEATURES.PLUS.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 rounded-lg bg-white/60 px-4 py-2 shadow-sm backdrop-blur-sm"
                >
                  <Sparkles className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            {TIER_FEATURES.PLUS_COMING_SOON &&
              TIER_FEATURES.PLUS_COMING_SOON.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {TIER_FEATURES.PLUS_COMING_SOON.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-lg border border-pink-200 bg-white/40 px-4 py-2 shadow-sm backdrop-blur-sm"
                    >
                      <Clock className="h-4 w-4 text-pink-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {feature}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/directory"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-pink-700 hover:to-rose-700 sm:w-auto"
            >
              Browse Directory
              <ArrowRight className="h-4 w-4" />
            </Link>
            {tinderId && (
              <Link
                href={`/insights/tinder/${tinderId}/compare`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-pink-200 bg-white/80 px-6 py-3 text-sm font-semibold text-pink-700 backdrop-blur-sm transition-all duration-200 hover:border-pink-300 hover:bg-pink-50 sm:w-auto"
              >
                Compare Profiles
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Upgrade card for free users
  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-200 sm:flex",
        className,
      )}
    >
      {/* Features section */}
      <div className="p-8 sm:flex-auto sm:p-10">
        <div className="flex items-center gap-3">
          <h3 className="text-3xl font-semibold tracking-tight text-gray-900">
            SwipeStats+
          </h3>
          <Badge className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
            Launch Offer
          </Badge>
        </div>
        <p className="mt-4 text-base leading-6 text-gray-600">
          Unlock deeper insights into your dating profile with advanced
          percentile rankings, demographic comparisons, and The Swipe Guide.
        </p>
        <div className="mt-6 flex items-center gap-x-4">
          <h4 className="flex-none text-sm leading-6 font-semibold text-rose-600">
            What&apos;s included
          </h4>
          <div className="h-px flex-auto bg-gray-100" />
        </div>
        <ul role="list" className="mt-6 space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Available Now
            </h4>
            <div className="grid grid-cols-1 gap-3 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-4">
              {TIER_FEATURES.PLUS.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <Check
                    aria-hidden="true"
                    className="h-6 w-5 flex-none text-rose-600"
                  />
                  {feature}
                </li>
              ))}
            </div>
          </div>

          {TIER_FEATURES.PLUS_COMING_SOON &&
            TIER_FEATURES.PLUS_COMING_SOON.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  Coming Soon
                  <Badge variant="outline" className="text-xs">
                    Included
                  </Badge>
                </h4>
                <div className="grid grid-cols-1 gap-3 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-4">
                  {TIER_FEATURES.PLUS_COMING_SOON.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Clock
                        aria-hidden="true"
                        className="h-6 w-5 flex-none text-rose-400"
                      />
                      {feature}
                    </li>
                  ))}
                </div>
              </div>
            )}
        </ul>
      </div>

      {/* Pricing section */}
      <div className="-mt-2 p-2 sm:mt-0 sm:flex sm:w-full sm:max-w-md sm:shrink-0">
        <div className="rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-gray-900/5 ring-inset sm:flex sm:flex-1 sm:flex-col sm:justify-center sm:py-16">
          <div className="mx-auto max-w-xs px-8">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Billing period toggle */}
            <div className="mb-6 inline-flex rounded-lg bg-gray-200 p-1">
              <button
                onClick={() => setSelectedPeriod("monthly")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  selectedPeriod === "monthly"
                    ? "bg-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPeriod("lifetime")}
                className={cn(
                  "relative rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  selectedPeriod === "lifetime"
                    ? "bg-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                Lifetime
                <span className="absolute -top-2 -right-2 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500"></span>
                </span>
              </button>
            </div>

            <p className="text-base font-semibold text-gray-600">
              {selectedPeriod === "lifetime"
                ? "🎉 Launch Special - 50% Off!"
                : "Flexible monthly billing"}
            </p>
            <p className="mt-6 flex items-baseline justify-center gap-x-2">
              {selectedPeriod === "lifetime" && (
                <span className="text-2xl font-semibold tracking-tight text-gray-400 line-through">
                  ${pricing.lifetime}
                </span>
              )}
              <span className="text-5xl font-semibold tracking-tight text-gray-900">
                $
                {selectedPeriod === "lifetime"
                  ? pricing.lifetimeLaunchPrice
                  : pricing[selectedPeriod]}
              </span>
              <span className="text-sm leading-6 font-semibold tracking-wide text-gray-600">
                {selectedPeriod === "monthly" ? "/mo" : "USD"}
              </span>
            </p>
            {selectedPeriod === "lifetime" && (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                Save $49 • Limited time offer
              </p>
            )}

            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get access"
              )}
            </button>

            <p className="mt-6 text-xs leading-5 text-gray-600">
              {selectedPeriod === "lifetime"
                ? "One-time payment • No recurring charges • All future features included"
                : "Cancel anytime • Upgrade to lifetime later"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
