"use client";

import { createContext, useContext, type ReactNode } from "react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { TinderProfileWithUsage } from "@/lib/types/profile";
import { useTinderProfile } from "./TinderProfileProvider";

type ComparisonContextValue = {
  comparisonProfiles: TinderProfileWithUsage[];
  loading: boolean;
  pendingProfileIds: string[];
  addComparisonId: (tinderId: string) => void;
  removeComparisonId: (tinderId: string) => void;
  comparisonIds: string[];
  readonly: boolean;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}

type ComparisonProviderProps = {
  children: ReactNode;
  // Optional props for showcase/demo mode
  initialProfiles?: TinderProfileWithUsage[];
  readonly?: boolean;
};

export function ComparisonProvider({
  children,
  initialProfiles,
  readonly = false,
}: ComparisonProviderProps) {
  // Get tinderId from parent provider
  const { tinderId } = useTinderProfile();

  const [urlComparisonIds, setUrlComparisonIds] = useQueryState(
    "compare",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // In readonly mode, use empty array instead of URL state
  const comparisonIds = readonly ? [] : urlComparisonIds;
  const setComparisonIds = readonly
    ? () => {
        // Do nothing
      }
    : setUrlComparisonIds;

  const trpc = useTRPC();

  // Fetch ONLY comparison profiles (not the main profile)
  const profilesQuery = useQuery(
    trpc.profile.getWithUsage.queryOptions(
      {
        tinderIds: comparisonIds,
      },
      {
        refetchOnWindowFocus: false,
        // Disable query when initialProfiles are provided (showcase mode)
        enabled: !initialProfiles && comparisonIds.length > 0,
      },
    ),
  );

  // Use initial data if provided, otherwise use query data
  const comparisonProfiles = initialProfiles ?? profilesQuery.data ?? [];

  // Only show skeleton on initial load (no data at all)
  const showSkeleton =
    !initialProfiles && profilesQuery.isLoading && !profilesQuery.data;

  // Determine which profiles are still loading (in URL but not in data yet)
  const loadedProfileIds = new Set(comparisonProfiles.map((p) => p.tinderId));
  const pendingProfileIds = comparisonIds.filter(
    (id) => !loadedProfileIds.has(id),
  );

  function addComparisonId(compareId: string) {
    if (readonly) {
      console.warn("Cannot add comparisons in readonly mode");
      return;
    }
    if (compareId === tinderId) {
      console.warn("Cannot compare with yourself");
      return;
    }
    if (comparisonIds.includes(compareId)) {
      console.warn("Already comparing with this profile");
      return;
    }
    void setComparisonIds([...comparisonIds, compareId]);
  }

  function removeComparisonId(compareId: string) {
    if (readonly) {
      console.warn("Cannot remove comparisons in readonly mode");
      return;
    }
    void setComparisonIds(comparisonIds.filter((id) => id !== compareId));
  }

  return (
    <ComparisonContext.Provider
      value={{
        comparisonProfiles,
        loading: showSkeleton,
        pendingProfileIds,
        addComparisonId,
        removeComparisonId,
        comparisonIds,
        readonly,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}
