"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { Match } from "@/server/db/schema";
import { useTinderProfile } from "../TinderProfileProvider";

type MessagesContextValue = {
  matches: Match[];
  loading: boolean;
  readonly: boolean;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within MessagesProvider");
  }
  return context;
}

type MessagesProviderProps = {
  children: ReactNode;
};

export function MessagesProvider({ children }: MessagesProviderProps) {
  // Get tinderId AND readonly from parent provider
  const { tinderId, readonly } = useTinderProfile();

  const trpc = useTRPC();

  // Fetch matches - OWNER ONLY (secured by tinderProfileOwnerProcedure)
  const matchesQuery = useQuery(
    trpc.match.listMatches.queryOptions(
      { tinderId },
      {
        refetchOnWindowFocus: false,
        enabled: !readonly, // Only fetch if user is owner
      },
    ),
  );

  const matches = matchesQuery.data ?? [];
  const loading = matchesQuery.isLoading;

  return (
    <MessagesContext.Provider
      value={{
        matches,
        loading,
        readonly, // Pass to components
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}
