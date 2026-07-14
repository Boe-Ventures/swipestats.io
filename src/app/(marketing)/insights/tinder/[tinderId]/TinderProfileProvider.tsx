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

export type TinderInsightsProfile = Pick<
  TinderProfile,
  | "tinderId"
  | "computed"
  | "ageAtUpload"
  | "ageAtLastUsage"
  | "createDate"
  | "activeTime"
  | "gender"
  | "genderStr"
  | "bio"
  | "city"
  | "country"
  | "region"
  | "userInterests"
  | "interests"
  | "instagramConnected"
  | "spotifyConnected"
  | "jobTitle"
  | "jobTitleDisplayed"
  | "company"
  | "companyDisplayed"
  | "school"
  | "schoolDisplayed"
  | "college"
  | "jobsRaw"
  | "schoolsRaw"
  | "educationLevel"
  | "ageFilterMin"
  | "ageFilterMax"
  | "interestedIn"
  | "interestedInStr"
  | "genderFilter"
  | "genderFilterStr"
  | "firstDayOnApp"
  | "lastDayOnApp"
  | "daysInProfilePeriod"
> & { profileMeta: ProfileMeta[] };

type TinderProfileContextValue = {
  tinderId: string;
  profile: TinderInsightsProfile;
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
  initialProfile: TinderInsightsProfile;
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

  // Events are private to the signed-in owner; public insight viewers receive
  // no owner identifier and never query another person's life events.
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
      enabled: !initialEvents && isOwner,
    }),
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
