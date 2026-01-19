"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { ProfileCard } from "./_components/ProfileCard";
import { DirectoryCTACard } from "./_components/DirectoryCTACard";
import { DirectoryMapView } from "./_components/DirectoryMapView";
import { ComingSoonWrapper } from "@/components/ComingSoonWrapper";
import NewsletterCTA from "../NewsletterCTA";

function DirectoryContent() {
  const trpc = useTRPC();

  // Simple query for 21 most recent profiles
  const queryInput = {
    page: 1,
    limit: 21, // 21 profiles + 3 CTA cards = 24 total (evenly divisible by 4 columns)
    sortBy: "newest" as const,
  };

  // Fetch profiles
  const { data, isLoading, error } = useQuery(
    trpc.directory.list.queryOptions(queryInput),
  );

  // Inject CTA cards at strategic positions
  const renderGridItems = () => {
    if (!data?.profiles) return null;

    const items: React.ReactNode[] = [];
    const ctaPositions = [4, 12, 20];
    const ctaTypes: Array<"upload" | "newsletter" | "premium"> = [
      "upload",
      "newsletter",
      "premium",
    ];

    data.profiles.forEach((profile, index) => {
      const position = index + 1;
      items.push(<ProfileCard key={profile.id} profile={profile} />);

      // Inject CTA card after specified positions
      if (ctaPositions.includes(position)) {
        const ctaIndex = ctaPositions.indexOf(position);
        items.push(
          <DirectoryCTACard
            key={`cta-${position}`}
            type={ctaTypes[ctaIndex % ctaTypes.length]!}
          />,
        );
      }
    });

    return items;
  };

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="space-y-3">
            <h1 className="from-foreground to-foreground/70 bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              Profile Directory
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
              Explore recently uploaded dating app profiles and their insights.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="text-primary h-10 w-10 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Loading profiles...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-6">
            <p className="text-destructive font-medium">
              Failed to load profiles
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {error.message}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.profiles.length === 0 && (
          <div className="bg-muted/30 relative flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
            <p className="text-foreground text-xl font-semibold">
              No profiles available yet
            </p>
            <p className="text-muted-foreground mt-3 max-w-md text-base leading-relaxed">
              Be the first to upload your profile and appear in the directory!
            </p>
          </div>
        )}

        {/* Stacked Views: Map + Coming Soon + Grid */}
        {!isLoading && !error && data && data.profiles.length > 0 && (
          <>
            {/* Map View - Always Shown */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Profile Map</h2>
              <DirectoryMapView profiles={data.profiles} totalCount={21} />
            </div>

            {/* Coming Soon Section */}
            <div className="py-8">
              <ComingSoonWrapper
                featureName="Advanced Filters & Full Directory"
                description="Filter by platform, gender, age, match rate, location and browse all 7,000+ profiles"
                topic="waitlist-directory-profiles"
                benefits={[
                  "Filter by platform, gender, age, and match rate",
                  "Search by location and sort by various metrics",
                  "Browse complete directory of 7,000+ profiles",
                ]}
              >
                {/* Empty - nothing to wrap */}
                <div />
              </ComingSoonWrapper>
            </div>

            {/* Grid View - Always Shown */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Recent Profiles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {renderGridItems()}
              </div>
            </div>
          </>
        )}

        {/* Newsletter CTA Banner */}
        <div className="border-t pt-16">
          <NewsletterCTA />
        </div>
      </div>
    </main>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-background min-h-screen">
          <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
            <div className="space-y-4">
              <div className="space-y-3">
                <h1 className="from-foreground to-foreground/70 bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                  Profile Directory
                </h1>
                <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                  Explore recently uploaded dating app profiles and their
                  insights.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="text-primary h-10 w-10 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Loading profiles...
                </p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}

/* ============================================================================
 * COMMENTED OUT FOR MVP - FILTERS & PAGINATION
 * Keep this code for future implementation / reference by AI agents
 * ============================================================================
 *
 * Original filter-based implementation with URL state management
 * To restore: uncomment this section and replace the simplified version above
 *
 * REMOVED IMPORTS:
 * - import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
 * - import { useQueryStates, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs";
 * - import { Button } from "@/components/ui/button";
 * - import { DirectoryFilters } from "./_components/DirectoryFilters";
 * - import { MapViewToggle } from "./_components/MapViewToggle";
 * - import NewsletterCTA from "../NewsletterCTA";
 *
 * REMOVED URL STATE MANAGEMENT:
 *
 * const [
 *   {
 *     page,
 *     platform,
 *     gender,
 *     ageMin,
 *     ageMax,
 *     matchRateMin,
 *     matchRateMax,
 *     country,
 *     sortBy,
 *     view,
 *     focusProfile,
 *   },
 *   setFilters,
 * ] = useQueryStates({
 *   page: parseAsInteger.withDefault(1),
 *   platform: parseAsStringEnum(["tinder", "hinge"]),
 *   gender: parseAsStringEnum(["MALE", "FEMALE", "OTHER", "MORE"]),
 *   ageMin: parseAsInteger,
 *   ageMax: parseAsInteger,
 *   matchRateMin: parseAsString,
 *   matchRateMax: parseAsString,
 *   country: parseAsString,
 *   sortBy: parseAsStringEnum([
 *     "newest",
 *     "most_matches",
 *     "highest_match_rate",
 *   ]).withDefault("newest"),
 *   view: parseAsStringEnum(["list", "map"]).withDefault("list"),
 *   focusProfile: parseAsString,
 * });
 *
 * REMOVED FILTER OPTIONS QUERY:
 *
 * const { data: filterOptions } = useQuery(
 *   trpc.directory.getFilterOptions.queryOptions(),
 * );
 *
 * REMOVED COMPLEX QUERY INPUT:
 *
 * const queryInput = useMemo(
 *   () => ({
 *     page: view === "map" ? 1 : (page ?? 1),
 *     limit: view === "map" ? 100 : limit,
 *     platform: platform as "tinder" | "hinge" | null | undefined,
 *     gender: gender as "MALE" | "FEMALE" | "OTHER" | "MORE" | null | undefined,
 *     ageMin: ageMin ?? null,
 *     ageMax: ageMax ?? null,
 *     matchRateMin: matchRateMin ? parseFloat(matchRateMin) : null,
 *     matchRateMax: matchRateMax ? parseFloat(matchRateMax) : null,
 *     country: country ?? null,
 *     sortBy: (sortBy ?? "newest") as "newest" | "most_matches" | "highest_match_rate",
 *   }),
 *   [page, platform, gender, ageMin, ageMax, matchRateMin, matchRateMax, country, sortBy, view],
 * );
 *
 * REMOVED ACTIVE FILTER COUNT LOGIC:
 *
 * const activeFilterCount = useMemo(() => {
 *   let count = 0;
 *   if (platform != null) count++;
 *   if (gender != null) count++;
 *   if (ageMin != null || ageMax != null) count++;
 *   if (matchRateMin != null || matchRateMax != null) count++;
 *   if (country != null) count++;
 *   if (sortBy !== "newest") count++;
 *   return count;
 * }, [platform, gender, ageMin, ageMax, matchRateMin, matchRateMax, country, sortBy]);
 *
 * const hasActiveFilters = activeFilterCount > 0;
 *
 * REMOVED FILTER UI SECTION:
 *
 * <div className="flex items-center justify-between">
 *   <div className="flex items-center gap-2">
 *     <Filter className="h-5 w-5" />
 *     <h2 className="text-lg font-semibold">Filters</h2>
 *   </div>
 *   <MapViewToggle
 *     view={view ?? "list"}
 *     onViewChange={(newView) => setFilters({ view: newView })}
 *   />
 * </div>
 * <DirectoryFilters
 *   filterOptions={filterOptions}
 *   activeFilterCount={activeFilterCount}
 * />
 *
 * REMOVED ACTIVE FILTER PILLS SECTION (Lines 196-280):
 * [Full section with platform, gender, age, matchRate, country, sortBy pills with remove buttons]
 *
 * REMOVED RESULTS COUNT SECTION:
 *
 * {!isLoading && data && view === "list" && hasActiveFilters && (
 *   <div className="flex items-center gap-2">
 *     <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
 *       {data.pagination.totalCount.toLocaleString()}
 *     </div>
 *     <p className="text-muted-foreground text-sm">
 *       profile{data.pagination.totalCount !== 1 ? "s" : ""} found
 *     </p>
 *   </div>
 * )}
 *
 * REMOVED CONDITIONAL MAP/LIST VIEW TOGGLE:
 * Replaced with stacked Map + Grid views (both always visible)
 *
 * REMOVED PAGINATION CONTROLS (Lines 375-422):
 * [Full pagination section with Previous/Next buttons]
 *
 * REMOVED NEWSLETTER CTA:
 * Replaced with ComingSoonWrapper for advanced features
 *
 * ============================================================================
 */
