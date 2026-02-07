"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Globe, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/index";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import type { DirectoryProfile } from "@/lib/types/directory";

interface DirectoryMapStatsProps {
  profiles: DirectoryProfile[];
  totalCount?: number;
  className?: string;
}

export function DirectoryMapStats({
  profiles,
  totalCount,
  className,
}: DirectoryMapStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();

  const hasPremiumAccess =
    effectiveTier === "PLUS" || effectiveTier === "ELITE";

  const stats = useMemo(() => {
    // Country distribution
    const countryMap = new Map<string, number>();
    profiles.forEach((profile) => {
      if (profile.country) {
        countryMap.set(
          profile.country,
          (countryMap.get(profile.country) ?? 0) + 1,
        );
      }
    });
    const topCountries = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Gender distribution
    const genderMap = new Map<string, number>();
    profiles.forEach((profile) => {
      const gender = profile.gender || "Unknown";
      genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1);
    });
    const genderDistribution = Array.from(genderMap.entries())
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count);

    // Platform split
    const platformCounts = {
      tinder: profiles.filter((p) => p.platform === "tinder").length,
      hinge: profiles.filter((p) => p.platform === "hinge").length,
    };

    // Average match rate
    const matchRates = profiles
      .map((p) => p.matchRate)
      .filter((rate): rate is number => rate !== null && rate !== undefined);
    const avgMatchRate =
      matchRates.length > 0
        ? matchRates.reduce((sum, rate) => sum + rate, 0) / matchRates.length
        : 0;

    // Total matches across all profiles
    const totalMatches = profiles.reduce(
      (sum, p) => sum + (p.matchesTotal ?? 0),
      0,
    );

    // Average time on platform
    const daysOnPlatform = profiles
      .map((p) => p.daysInPeriod)
      .filter((days): days is number => days !== null && days !== undefined);
    const avgDaysOnPlatform =
      daysOnPlatform.length > 0
        ? Math.round(
            daysOnPlatform.reduce((sum, days) => sum + days, 0) /
              daysOnPlatform.length,
          )
        : 0;

    return {
      topCountries,
      genderDistribution,
      platformCounts,
      avgMatchRate,
      totalMatches,
      avgDaysOnPlatform,
    };
  }, [profiles]);

  const _totalProfiles = totalCount ?? profiles.length;
  const filteredCount = profiles.length;

  return (
    <div
      className={cn(
        "bg-background/95 absolute top-4 right-4 z-10 w-64 rounded-lg border shadow-lg backdrop-blur-sm transition-all sm:w-72",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Map Statistics</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-6 w-6 p-0"
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 p-4">
          {/* Total Count */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                Profiles on Map
              </span>
              <span className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                {filteredCount}
              </span>
            </div>
            {totalCount && totalCount > filteredCount && (
              <p className="text-muted-foreground text-xs">
                {totalCount - filteredCount} filtered out
              </p>
            )}
          </div>

          {/* Platform Split */}
          <div className="space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Platform Split
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-pink-500" />
                  <span className="text-xs">Tinder</span>
                </div>
                <span className="text-xs font-semibold">
                  {stats.platformCounts.tinder} (
                  {filteredCount > 0
                    ? Math.round(
                        (stats.platformCounts.tinder / filteredCount) * 100,
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-xs">Hinge</span>
                </div>
                <span className="text-xs font-semibold">
                  {stats.platformCounts.hinge} (
                  {filteredCount > 0
                    ? Math.round(
                        (stats.platformCounts.hinge / filteredCount) * 100,
                      )
                    : 0}
                  %)
                </span>
              </div>
            </div>
          </div>

          {/* Gender Distribution */}
          {stats.genderDistribution.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Gender Distribution
              </p>
              <div className="space-y-1.5">
                {stats.genderDistribution.map(({ gender, count }) => (
                  <div
                    key={gender}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs capitalize">{gender}</span>
                    <span className="text-xs font-semibold">
                      {count} (
                      {filteredCount > 0
                        ? Math.round((count / filteredCount) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aggregate Stats - Premium */}
          {hasPremiumAccess ? (
            <>
              <div className="space-y-2 border-t pt-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Community Stats
                </p>
                <div className="space-y-1.5">
                  {stats.totalMatches > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Total Matches</span>
                      <span className="text-xs font-semibold">
                        {stats.totalMatches.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {stats.avgMatchRate > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="text-muted-foreground h-3 w-3" />
                        <span className="text-xs">Avg Match Rate</span>
                      </div>
                      <span className="text-xs font-semibold">
                        {(stats.avgMatchRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {stats.avgDaysOnPlatform > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Avg Time on App</span>
                      <span className="text-xs font-semibold">
                        {stats.avgDaysOnPlatform < 30
                          ? `${stats.avgDaysOnPlatform}d`
                          : stats.avgDaysOnPlatform < 365
                            ? `${Math.floor(stats.avgDaysOnPlatform / 30)}mo`
                            : `${Math.floor(stats.avgDaysOnPlatform / 365)}y`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Countries */}
              {stats.topCountries.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Top Countries
                  </p>
                  <div className="space-y-1.5">
                    {stats.topCountries.map(({ country, count }) => (
                      <div
                        key={country}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate text-xs">{country}</span>
                        <span className="text-xs font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Locked Premium Stats */
            <div className="relative border-t pt-3">
              {/* Blurred preview */}
              <div className="pointer-events-none space-y-2 opacity-30 blur-sm">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Community Stats
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Total Matches</span>
                    <span className="text-xs font-semibold">22,554</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="text-muted-foreground h-3 w-3" />
                      <span className="text-xs">Avg Match Rate</span>
                    </div>
                    <span className="text-xs font-semibold">12.4%</span>
                  </div>
                </div>
              </div>

              {/* Upgrade CTA */}
              <div className="mt-3 rounded-md border bg-linear-to-r from-pink-50 to-rose-50 p-3 dark:from-pink-950/50 dark:to-rose-950/50">
                <div className="flex items-start gap-2">
                  <Crown className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs leading-tight font-semibold">
                      Unlock Community Stats
                    </p>
                    <p className="text-muted-foreground text-xs leading-tight">
                      See aggregate data across all profiles
                    </p>
                    <Button
                      size="sm"
                      onClick={() =>
                        openUpgradeModal({
                          tier: "PLUS",
                          feature: "Community Stats",
                        })
                      }
                      className={cn(
                        "h-7 w-full text-xs font-semibold",
                        "bg-linear-to-r from-pink-600 to-rose-600",
                        "hover:from-pink-700 hover:to-rose-700",
                      )}
                    >
                      <Crown className="mr-1 h-3 w-3" />
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
