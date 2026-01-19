"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { DashboardHero } from "./DashboardHero";
import { ProfileCompareSection } from "./ProfileCompareSection";
import { useSubscription } from "@/hooks/useSubscription";

export function DashboardClient() {
  const { data: session } = authClient.useSession();
  const [upgraded, setUpgraded] = useQueryState("upgraded");
  const { refetch } = useSubscription();
  const trpc = useTRPC();
  const { data: uploadedProfiles, isLoading: profilesLoading } = useQuery(
    trpc.user.getUploadedProfiles.queryOptions(undefined, {
      enabled: !!session?.user,
    }),
  );

  // Handle upgrade success redirect from LemonSqueezy
  useEffect(() => {
    if (upgraded === "true") {
      // Optimistic: Immediately refresh session
      // Webhook is typically fast (<1s), so session should have updated tier
      void refetch();

      // Show success toast
      toast.success("🎉 Welcome to SwipeStats Plus!", {
        description: "You now have access to all premium features",
      });

      // Clean URL (nuqs handles this gracefully)
      void setUpgraded(null);
    }
  }, [upgraded, refetch, setUpgraded]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      {profilesLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-96" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DashboardHero
          tinderProfiles={uploadedProfiles?.tinder ?? []}
          hingeProfiles={uploadedProfiles?.hinge ?? []}
        />
      )}

      {/* Profile Comparisons Section */}
      <ProfileCompareSection />
    </div>
  );
}
