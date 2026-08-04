"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { ProfileMeta, Event } from "@/server/db/schema";
import type {
  HingeInsightsInteraction,
  HingeProfileWithStats,
} from "@/lib/types/hinge-profile";
import { getGlobalMeta } from "@/lib/types/hinge-profile";

type HingeInsightsContextValue = {
  hingeId: string;
  profile: HingeProfileWithStats | null;
  meta: ProfileMeta | null;
  interactions: HingeInsightsInteraction[];
  events: Event[];
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
  readonly?: boolean;
  isOwner?: boolean;
  isAnonymous?: boolean;
};

export function HingeInsightsProvider({
  children,
  hingeId,
  readonly = false,
  isOwner = false,
  isAnonymous = false,
}: HingeInsightsProviderProps) {
  const trpc = useTRPC();

  // Fetch full profile with stats (matches, messages, prompts, interactions)
  const profileQuery = useQuery(
    trpc.hingeProfile.getWithStats.queryOptions(
      { hingeId },
      { refetchOnWindowFocus: false },
    ),
  );

  // Event overlays are private to the signed-in owner.
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
      enabled: isOwner,
    }),
  );

  const profile = profileQuery.data ?? null;
  const meta = profile ? getGlobalMeta(profile) : null;
  const interactions = profile?.interactions ?? [];
  const events = eventsQuery.data ?? [];

  return (
    <HingeInsightsContext.Provider
      value={{
        hingeId,
        profile,
        meta,
        interactions,
        events,
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
