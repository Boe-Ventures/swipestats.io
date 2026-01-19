"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type {
  Event,
  ProfileMeta,
  TinderUsage,
  TinderProfile,
} from "@/server/db/schema";
import { getGlobalMeta } from "@/lib/types/profile";

type TinderProfileContextValue = {
  tinderId: string;
  profile: TinderProfile & { profileMeta: ProfileMeta[] };
  usage: TinderUsage[];
  meta: ProfileMeta | null;
  events: Event[];
  usageLoading: boolean;
  readonly: boolean;
  isOwner: boolean;
  isAnonymous: boolean;
};

const TinderProfileContext = createContext<TinderProfileContextValue | null>(
  null,
);

export function useTinderProfile() {
  const context = useContext(TinderProfileContext);
  if (!context) {
    throw new Error(
      "useTinderProfile must be used within TinderProfileProvider",
    );
  }
  return context;
}

type Props = {
  children: ReactNode;
  tinderId: string;
  initialProfile: TinderProfile & { profileMeta: ProfileMeta[] };
  initialUsage?: TinderUsage[]; // Optional for demo/showcase mode
  initialEvents?: Event[]; // Optional for demo/showcase mode
  readonly?: boolean;
  isOwner?: boolean;
  isAnonymous?: boolean;
};

export function TinderProfileProvider({
  children,
  tinderId,
  initialProfile,
  initialUsage,
  initialEvents,
  readonly = false,
  isOwner = false,
  isAnonymous = false,
}: Props) {
  const trpc = useTRPC();

  // Client-side usage fetch (public - works for any profile)
  // Disabled if initialUsage provided (demo mode)
  const usageQuery = useQuery(
    trpc.profile.getUsage.queryOptions(
      { tinderId },
      {
        refetchOnWindowFocus: false,
        enabled: !initialUsage, // Don't fetch if already provided
      },
    ),
  );

  // Client-side events fetch (public - works for any profile)
  // Fetches events for the profile owner (userId from profile)
  // Disabled if initialEvents provided (demo mode)
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(
      { userId: initialProfile.userId ?? undefined },
      {
        refetchOnWindowFocus: false,
        enabled: !initialEvents && !!initialProfile.userId, // Skip if provided (demo mode) or no userId
      },
    ),
  );

  const usage = initialUsage ?? usageQuery.data ?? [];
  const meta = getGlobalMeta({ ...initialProfile, usage });

  return (
    <TinderProfileContext.Provider
      value={{
        tinderId,
        profile: initialProfile,
        usage,
        meta,
        events: initialEvents ?? eventsQuery.data ?? [],
        usageLoading: usageQuery.isLoading,
        readonly,
        isOwner,
        isAnonymous,
      }}
    >
      {children}
    </TinderProfileContext.Provider>
  );
}
