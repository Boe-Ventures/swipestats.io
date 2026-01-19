"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { HingeProfile, ProfileMeta } from "@/server/db/schema";
import type { HingeProfileWithStats } from "@/lib/types/hinge-profile";
import { getGlobalMeta } from "@/lib/types/hinge-profile";

type HingeInsightsContextValue = {
  hingeId: string;
  profile: HingeProfileWithStats | null;
  meta: ProfileMeta | null;
  usageLoading: boolean;
  readonly: boolean;
  isOwner: boolean;
  isAnonymous: boolean;
};

const HingeInsightsContext = createContext<HingeInsightsContextValue | null>(
  null,
);

export function useHingeInsights() {
  const context = useContext(HingeInsightsContext);
  if (!context) {
    throw new Error(
      "useHingeInsights must be used within HingeInsightsProvider",
    );
  }
  return context;
}

type HingeInsightsProviderProps = {
  children: ReactNode;
  hingeId: string;
  initialProfile: HingeProfile & { profileMeta: ProfileMeta[] };
  readonly?: boolean;
  isOwner?: boolean;
  isAnonymous?: boolean;
};

export function HingeInsightsProvider({
  children,
  hingeId,
  initialProfile,
  readonly = false,
  isOwner = false,
  isAnonymous = false,
}: HingeInsightsProviderProps) {
  const trpc = useTRPC();

  // Fetch full profile with stats (matches, messages, prompts)
  const profileQuery = useQuery(
    trpc.hingeProfile.getWithStats.queryOptions(
      { hingeId },
      { refetchOnWindowFocus: false },
    ),
  );

  const profile = profileQuery.data ?? null;
  const meta = profile ? getGlobalMeta(profile) : null;

  return (
    <HingeInsightsContext.Provider
      value={{
        hingeId,
        profile,
        meta,
        usageLoading: profileQuery.isLoading,
        readonly,
        isOwner,
        isAnonymous,
      }}
    >
      {children}
    </HingeInsightsContext.Provider>
  );
}
