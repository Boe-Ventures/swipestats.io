"use client";

import { createContext, useContext, type ReactNode } from "react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { TinderProfile, Event } from "@/server/db/schema";
import type { TinderProfileWithUsage } from "@/lib/types/profile";

type InsightsContextValue = {
  myTinderId: string;
  myTinderProfile: TinderProfile;
  profiles: TinderProfileWithUsage[];
  events: Event[];
  loading: boolean;
  pendingProfileIds: string[];
  addComparisonId: (tinderId: string) => void;
  removeComparisonId: (tinderId: string) => void;
  comparisonIds: string[];
  readonly: boolean;
};

const InsightsContext = createContext<InsightsContextValue | null>(null);

export function useInsights() {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error("useInsights must be used within InsightsProvider");
  }
  return context;
}

type InsightsProviderProps = {
  children: ReactNode;
  myTinderId: string;
  myTinderProfile: TinderProfile;
  // Optional props for showcase/demo mode
  initialProfiles?: TinderProfileWithUsage[];
  initialEvents?: Event[];
  readonly?: boolean;
};

export function InsightsProvider({
  children,
  myTinderId,
  myTinderProfile,
  initialProfiles,
  initialEvents,
  readonly = false,
}: InsightsProviderProps) {
  const [urlComparisonIds, setUrlComparisonIds] = useQueryState(
    "compare",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // In readonly mode, use empty array instead of URL state
  const comparisonIds = readonly ? [] : urlComparisonIds;
  const setComparisonIds = readonly
    ? () => {
        // No-op in readonly mode
      }
    : setUrlComparisonIds;

  const trpc = useTRPC();
  // Fetch all profiles (main + comparisons) with usage data
  const allTinderIds = [myTinderId, ...comparisonIds];

  const profilesQuery = useQuery(
    trpc.profile.getWithUsage.queryOptions(
      {
        tinderIds: allTinderIds,
      },
      {
        refetchOnWindowFocus: false,
        // Disable query when initialProfiles are provided (showcase mode)
        enabled: !initialProfiles,
      },
    ),
  );

  // Fetch user events for chart overlays
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
      // Disable events query in readonly mode or when initialEvents provided
      enabled: !readonly && !initialEvents,
    }),
  );

  // Use initial data if provided, otherwise use query data
  const profiles = initialProfiles ?? profilesQuery.data ?? [];
  const events = initialEvents ?? eventsQuery.data ?? [];

  // Only show skeleton on initial load (no data at all)
  const showSkeleton =
    !initialProfiles && profilesQuery.isLoading && !profilesQuery.data;

  // Determine which profiles are still loading (in URL but not in data yet)
  const loadedProfileIds = new Set(profiles.map((p) => p.tinderId));
  const pendingProfileIds = allTinderIds.filter(
    (id) => !loadedProfileIds.has(id),
  );

  function addComparisonId(tinderId: string) {
    if (readonly) {
      console.warn("Cannot add comparisons in readonly mode");
      return;
    }
    if (tinderId === myTinderId) {
      console.warn("Cannot compare with yourself");
      return;
    }
    if (comparisonIds.includes(tinderId)) {
      console.warn("Already comparing with this profile");
      return;
    }
    void setComparisonIds([...comparisonIds, tinderId]);
  }

  function removeComparisonId(tinderId: string) {
    if (readonly) {
      console.warn("Cannot remove comparisons in readonly mode");
      return;
    }
    void setComparisonIds(comparisonIds.filter((id) => id !== tinderId));
  }

  return (
    <InsightsContext.Provider
      value={{
        myTinderId,
        myTinderProfile,
        profiles,
        events,
        loading: showSkeleton, // Only true on initial load, not refetches
        pendingProfileIds,
        addComparisonId,
        removeComparisonId,
        comparisonIds,
        readonly,
      }}
    >
      {children}
    </InsightsContext.Provider>
  );
}
