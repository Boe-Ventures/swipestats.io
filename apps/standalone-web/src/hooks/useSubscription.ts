import { useMemo } from "react";

import { authClient } from "@/server/better-auth/client";
import type { SwipestatsTier } from "@/server/db/schema";

// Extended user type with custom SwipeStats fields
// These are defined in the auth config as additionalFields
interface ExtendedUser {
  swipestatsTier?: string;
  subscriptionProviderId?: string;
  subscriptionCurrentPeriodEnd?: Date | string | null;
  isLifetime?: boolean;
}

export function useSubscription() {
  const { data: session, ...sessionQuery } = authClient.useSession();

  const subscription = useMemo(() => {
    if (!session?.user) {
      return {
        tier: "FREE" as SwipestatsTier,
        effectiveTier: "FREE" as SwipestatsTier,
        isSubscribed: false,
        isLifetime: false,
        periodEnd: null,
        isActive: false,
      };
    }

    // Cast user to include extended fields from auth config
    const user = session.user as typeof session.user & ExtendedUser;

    // Determine if subscription is active
    const isLifetime = user.isLifetime ?? false;
    const periodEnd = user.subscriptionCurrentPeriodEnd
      ? new Date(user.subscriptionCurrentPeriodEnd)
      : null;
    const isActive = isLifetime || (periodEnd ? periodEnd > new Date() : false);

    // Compute effective tier (considering expiry)
    const storedTier = (user.swipestatsTier as SwipestatsTier) || "FREE";
    const effectiveTier: SwipestatsTier = isActive ? storedTier : "FREE";

    return {
      tier: storedTier,
      effectiveTier,
      isSubscribed: effectiveTier !== "FREE",
      isLifetime,
      periodEnd,
      isActive,
    };
  }, [session]);

  return {
    ...subscription,
    session,
    refetch: sessionQuery.refetch,
    isLoading: sessionQuery.isPending,
  };
}
