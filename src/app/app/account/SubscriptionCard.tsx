"use client";

import {
  ExternalLink,
  Crown,
  Sparkles,
  CreditCard,
  Calendar,
  AlertCircle,
  Check,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useUpgrade } from "@/contexts/UpgradeContext";
import { cn } from "@/components/ui/lib/utils";

export function SubscriptionCard() {
  const trpc = useTRPC();
  const { openUpgradeModal } = useUpgrade();

  const { data: billingStatus, isLoading } = useQuery(
    trpc.billing.getFullStatus.queryOptions(),
  );

  if (isLoading) {
    return <SubscriptionCardSkeleton />;
  }

  if (!billingStatus) {
    return null;
  }

  const { tier, isLifetime, currentPeriodEnd, subscription } = billingStatus;

  // FREE tier - show upgrade CTA
  if (tier === "FREE") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            Free Plan
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Upgrade to SwipeStats Plus or Elite to unlock demographic comparisons,
          premium guides, and more.
        </p>
        <Button
          onClick={() => openUpgradeModal()}
          className="bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade Now
        </Button>
      </div>
    );
  }

  // Lifetime subscription
  if (isLifetime) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
              <Crown className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-2xl leading-tight font-bold tracking-tight text-gray-900 sm:text-3xl">
                SwipeStats {tier === "ELITE" ? "Elite" : "Plus"}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                All your {tier === "ELITE" ? "Elite" : "Plus"} features, yours
                for good. Thank you for supporting SwipeStats.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700">
            <InfinityIcon className="size-4" aria-hidden="true" />
            Lifetime access
          </span>
        </div>
        <dl className="grid gap-4 rounded-2xl border border-gray-200/80 bg-white/80 p-5 sm:grid-cols-2 sm:gap-6">
          <div>
            <dt className="text-xs font-medium text-gray-500">Plan status</dt>
            <dd className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Check className="size-4 text-emerald-600" aria-hidden="true" />
              Active for life
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Billing</dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              No recurring charges
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  // Recurring subscription with LemonSqueezy details
  if (subscription) {
    const isCancelled = subscription.cancelled;
    const statusColor =
      {
        active: "bg-green-100 text-green-800",
        on_trial: "bg-blue-100 text-blue-800",
        cancelled: "bg-yellow-100 text-yellow-800",
        past_due: "bg-red-100 text-red-800",
        paused: "bg-gray-100 text-gray-800",
        expired: "bg-red-100 text-red-800",
      }[subscription.status] || "bg-gray-100 text-gray-800";

    return (
      <div className="space-y-4">
        {/* Status & Plan */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-linear-to-r from-pink-500 to-rose-500 text-white">
            <Crown className="mr-1 h-3 w-3" />
            {tier}
          </Badge>
          <Badge className={cn("font-medium", statusColor)}>
            {subscription.statusFormatted}
          </Badge>
        </div>

        {/* Billing Info */}
        <div className="space-y-2">
          {/* Card Info */}
          {subscription.cardBrand && subscription.cardLastFour && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              <span className="capitalize">{subscription.cardBrand}</span>
              <span>ending in {subscription.cardLastFour}</span>
            </div>
          )}

          {/* Renewal/Expiry Info */}
          {isCancelled ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>
                Access until{" "}
                {subscription.endsAt
                  ? new Date(subscription.endsAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "end of billing period"}
              </span>
            </div>
          ) : (
            subscription.renewsAt && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  Renews on{" "}
                  {new Date(subscription.renewsAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {subscription.customerPortalUrl && (
            <ButtonLink
              href={subscription.customerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              Manage Subscription
              <ExternalLink className="h-4 w-4" />
            </ButtonLink>
          )}
          {subscription.updatePaymentMethodUrl && (
            <ButtonLink
              href={subscription.updatePaymentMethodUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
            >
              Update Payment Method
            </ButtonLink>
          )}
        </div>

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/20">
            <p className="text-yellow-800 dark:text-yellow-200">
              Your subscription has been cancelled but you still have access
              until the end of your billing period. You can reactivate anytime
              from the customer portal.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Fallback for recurring subscription without LemonSqueezy details
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge className="bg-linear-to-r from-pink-500 to-rose-500 text-white">
          <Crown className="mr-1 h-3 w-3" />
          {tier}
        </Badge>
      </div>
      {currentPeriodEnd && (
        <p className="text-muted-foreground text-sm">
          Active until{" "}
          {new Date(currentPeriodEnd).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

function SubscriptionCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-36" />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  );
}
