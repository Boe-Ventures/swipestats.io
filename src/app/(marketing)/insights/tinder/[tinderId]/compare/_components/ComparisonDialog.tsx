"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Loader2,
  Heart,
  Sparkles,
  Crown,
  BarChart3,
  Check,
} from "lucide-react";
import Link from "next/link";
import { SimpleDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ProfileCard } from "@/app/(marketing)/directory/_components/ProfileCard";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import {
  DEMO_PROFILE_IDS,
  isDemoProfile,
  getDemoProfileLabel,
} from "@/lib/constants/demoProfiles";
import { cn } from "@/components/ui";
import { Separator } from "@/components/ui/separator";
import { InfoAlert } from "@/components/ui/alert";

export function ComparisonDialog() {
  const [open, setOpen] = useState(false);
  const [showAllCohorts, setShowAllCohorts] = useState(false);
  const { tinderId, meta } = useTinderProfile();
  const { addComparisonId, comparisonIds } = useComparison();
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const trpc = useTRPC();

  // Extract user's match rate and date range for comparison
  const userMatchRate = meta?.matchRate ?? null;
  const userDateRange =
    meta?.from && meta?.to ? { from: meta.from, to: meta.to } : null;

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";

  const { data, isLoading } = useQuery(
    trpc.directory.list.queryOptions({
      page: 1,
      limit: 50,
      platform: "tinder", // Only show Tinder profiles
    }),
  );

  // Fetch synthetic cohort profiles
  const { data: syntheticProfiles } = useQuery(
    trpc.cohort.listSyntheticProfiles.queryOptions(),
  );

  // Organize cohorts: filter out "Everyone", prioritize "Men" and "Women", sort rest alphabetically
  const organizedCohorts = useMemo(() => {
    if (!syntheticProfiles) return { primary: [], rest: [] };

    // Filter out "Everyone" cohort
    const filtered = syntheticProfiles.filter(
      (p) => p.cohortName !== "Everyone",
    );

    // Separate primary cohorts (Men, Women)
    const primaryNames = ["Men", "Women"];
    const primary = primaryNames
      .map((name) => filtered.find((p) => p.cohortName === name))
      .filter(Boolean) as typeof syntheticProfiles;

    // Get remaining cohorts and sort alphabetically
    const rest = filtered
      .filter((p) => !primaryNames.includes(p.cohortName))
      .sort((a, b) => a.cohortName.localeCompare(b.cohortName));

    return { primary, rest };
  }, [syntheticProfiles]);

  // Show primary cohorts + limited rest by default, toggle to show all
  const displayedCohorts = showAllCohorts
    ? [...organizedCohorts.primary, ...organizedCohorts.rest]
    : organizedCohorts.primary;

  // Combine demo profiles with real profiles
  // Free users only see demo profiles, premium users see all
  const demoProfiles = useMemo(() => {
    if (!data?.profiles?.length) return [];
    const demoIdSet = new Set<string>(DEMO_PROFILE_IDS);
    const demoMap = new Map(
      data.profiles
        .filter((profile) => demoIdSet.has(profile.id))
        .map((profile) => [profile.id, profile]),
    );
    return DEMO_PROFILE_IDS.map((id) => demoMap.get(id)).filter(
      (profile): profile is (typeof data.profiles)[number] => Boolean(profile),
    );
  }, [data?.profiles]);

  const _availableProfiles = useMemo(() => {
    if (hasPremiumAccess) {
      // Premium users see all real profiles
      return data?.profiles.filter((p) => p.id !== tinderId) || [];
    } else {
      // Free users only see demo profiles
      return demoProfiles;
    }
  }, [data?.profiles, tinderId, hasPremiumAccess, demoProfiles]);

  // Premium profiles (locked for free users)
  const _premiumProfiles = useMemo(() => {
    if (hasPremiumAccess) return [];
    return data?.profiles.filter((p) => p.id !== tinderId).slice(0, 4) || [];
  }, [data?.profiles, tinderId, hasPremiumAccess]);

  const handleAddProfile = (tinderId: string) => {
    // Check if it's a premium profile and user doesn't have access
    if (!hasPremiumAccess && !isDemoProfile(tinderId)) {
      openUpgradeModal({ tier: "PLUS", feature: "Profile Comparison" });
      return;
    }
    addComparisonId(tinderId);
  };

  return (
    <SimpleDialog
      title="Add Profile to Compare"
      description="Select profiles from the directory to compare against your data"
      trigger={
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Comparison
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      size="xl"
      scrollable
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="text-primary h-12 w-12 animate-spin" />
              <Sparkles className="text-primary/40 absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Finding profiles...
            </p>
          </div>
        </div>
      ) : !data?.profiles.length ? (
        <div className="from-muted/30 to-muted/10 rounded-xl border border-dashed bg-linear-to-br p-16 text-center">
          <div className="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Heart className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-foreground mb-2 text-lg font-semibold">
            No profiles found
          </p>
          <p className="text-muted-foreground text-sm">
            No other profiles available for comparison
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Demo Profiles Section - Always shown at top */}
          {demoProfiles.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Free Demo Profiles
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Compare against these sample profiles for free
                    </p>
                  </div>
                  <Sparkles className="text-primary h-5 w-5" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {demoProfiles.map((profile) => {
                    const isSelected = comparisonIds.includes(profile.id);
                    return (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        variant="select"
                        isSelected={isSelected}
                        onSelect={handleAddProfile}
                        specialLabel={getDemoProfileLabel(profile.id)}
                        userMatchRate={userMatchRate}
                        userDateRange={userDateRange}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Info about directory comparisons coming soon */}
          <InfoAlert>
            <p>
              Directory profile comparisons coming soon.{" "}
              <Link
                href="/directory"
                className="font-medium underline underline-offset-2 hover:text-blue-700"
              >
                Browse profiles in the directory
              </Link>
            </p>
          </InfoAlert>

          <Separator className="my-2" />

          {/* Cohort Averages Section */}
          {syntheticProfiles && syntheticProfiles.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Cohort Averages</h3>
                    <p className="text-muted-foreground text-xs">
                      Compare against aggregated data from similar users
                    </p>
                  </div>
                  <BarChart3 className="text-primary h-5 w-5" />
                </div>

                {hasPremiumAccess ? (
                  <div className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {displayedCohorts?.map((profile) => {
                        const isSelected = comparisonIds.includes(
                          profile.tinderId,
                        );
                        return (
                          <button
                            key={profile.tinderId}
                            onClick={() => handleAddProfile(profile.tinderId)}
                            className={cn(
                              "rounded-lg border p-4 text-left transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                                <BarChart3 className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">
                                  {profile.cohortName}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  Based on{" "}
                                  {profile.profileCount.toLocaleString()}{" "}
                                  profiles
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Match Rate:
                                </span>{" "}
                                <span className="font-medium">
                                  {profile.matchRate
                                    ? (profile.matchRate * 100).toFixed(1)
                                    : "N/A"}
                                  %
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Matches:
                                </span>{" "}
                                <span className="font-medium">
                                  {profile.matchesTotal?.toLocaleString() ??
                                    "N/A"}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-primary mt-2 flex items-center gap-1 text-xs">
                                <Check className="h-3 w-3" /> Selected
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {organizedCohorts.rest.length > 0 && (
                      <button
                        onClick={() => setShowAllCohorts(!showAllCohorts)}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {showAllCohorts
                          ? "Show Less"
                          : `View All ${organizedCohorts.primary.length + organizedCohorts.rest.length} Cohorts`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-linear-to-r from-pink-50 to-rose-50 p-6 dark:from-pink-950/50 dark:to-rose-950/50">
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-2 font-semibold">
                          Unlock Cohort Comparisons
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          Compare your stats against aggregated data from
                          similar users and see how you stack up
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          openUpgradeModal({
                            tier: "PLUS",
                            feature: "Cohort Comparisons",
                          })
                        }
                        className="w-full"
                      >
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to Plus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {/* Locked Premium Profiles - Coming Soon - Commented out for now */}
          {/* {!hasPremiumAccess && (
            <ComingSoonWrapper
              featureName="All Directory Profiles"
              description="Get access to compare your data with 7000+ real user profiles from our directory"
              topic="waitlist-directory-profiles"
              benefits={[
                "Compare with 7,000+ verified real users",
                "Filter by demographics and match rates",
                "See how you stack up globally",
              ]}
            >
              <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      All Directory Profiles
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Unlock access to compare with any profile
                    </p>
                  </div>
                  <Lock className="text-muted-foreground h-5 w-5" />
                </div>

                <div className="relative">
                  <div className="pointer-events-none grid gap-4 opacity-40 blur-sm sm:grid-cols-2">
                    {premiumProfiles.map((profile) => (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        variant="select"
                        isSelected={false}
                        onSelect={() => {}}
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="mx-auto max-w-sm rounded-lg border bg-linear-to-r from-pink-50 to-rose-50 p-6 shadow-lg dark:from-pink-950/50 dark:to-rose-950/50">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500 shadow-md">
                          <Crown className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Unlock All Profiles
                          </h3>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Compare with 7000+ real user profiles
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            openUpgradeModal({
                              tier: "PLUS",
                              feature: "Profile Comparison",
                            })
                          }
                          className={cn(
                            "w-full font-semibold",
                            "bg-linear-to-r from-pink-600 to-rose-600",
                            "hover:from-pink-700 hover:to-rose-700",
                          )}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Plus
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ComingSoonWrapper>
          )} */}
        </div>
      )}
    </SimpleDialog>
  );
}
