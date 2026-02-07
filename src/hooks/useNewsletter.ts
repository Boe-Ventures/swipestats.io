"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import { useLocalStorage } from "@/components/ui/hooks/use-local-storage";
import type { TopicKey } from "@/lib/validators";
import { isAnonymousEmail } from "@/lib/utils/auth";

// =====================================================
// TYPES
// =====================================================

type LocalNewsletterData = {
  email?: string; // Email for pre-filling forms
};

type UserState = "logged-out" | "anonymous" | "real";

export type UseNewsletterOptions = {
  /** Whether to auto-fetch topics for real users. Default: true */
  autoFetch?: boolean;
};

export type UseNewsletterReturn = {
  // State
  isLoading: boolean;
  topics: TopicKey[]; // Array of subscribed topic keys
  email?: string; // Email associated with subscription

  // Methods
  isSubscribedToTopic: (topic: TopicKey) => boolean;
  subscribe: (params: { email?: string; topic: TopicKey }) => Promise<void>;
  unsubscribe: (topic: TopicKey) => Promise<void>;

  // Metadata
  userState: UserState;
};

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY = "swipestats_newsletter_subscriptions";

// =====================================================
// HOOK
// =====================================================

export function useNewsletter(
  options: UseNewsletterOptions = {},
): UseNewsletterReturn {
  const { autoFetch = true } = options;

  // Get session state
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  // Determine user state
  const userState = useMemo<UserState>(() => {
    if (!session?.user) return "logged-out";
    if (session.user.email && isAnonymousEmail(session.user.email))
      return "anonymous";
    return "real";
  }, [session]);

  const isRealUser = userState === "real";

  // Initialize tRPC
  const trpc = useTRPC();

  // localStorage for anonymous/logged-out users (email pre-filling only)
  const [localData, setLocalData] = useLocalStorage<
    LocalNewsletterData | undefined
  >({
    key: STORAGE_KEY,
    defaultValue: undefined,
  });

  // Get email for API query
  const emailForQuery = isRealUser
    ? undefined // Real users use session email
    : localData?.email && !isAnonymousEmail(localData.email)
      ? localData.email // Anonymous users with real email in localStorage
      : undefined;

  // API query - enabled for:
  // 1. Real users with autoFetch=true
  // 2. Anonymous users with a real email in localStorage
  const shouldFetchFromAPI = autoFetch && (isRealUser || !!emailForQuery);

  const topicsQuery = useQuery({
    ...trpc.newsletter.getMyTopics.queryOptions(
      emailForQuery ? { email: emailForQuery } : undefined,
    ),
    enabled: shouldFetchFromAPI,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Subscribe mutation - invalidates all getMyTopics queries globally
  const subscribeMutation = useMutation(
    trpc.newsletter.subscribe.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [["newsletter", "getMyTopics"]],
        });
      },
    }),
  );

  // Update topics mutation - invalidates all getMyTopics queries globally
  const updateTopicsMutation = useMutation(
    trpc.newsletter.updateMyTopics.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [["newsletter", "getMyTopics"]],
        });
      },
    }),
  );

  // =====================================================
  // COMPUTED STATE
  // =====================================================

  const topics = useMemo<TopicKey[]>(() => {
    // Topics always come from API
    return topicsQuery.data?.topics || [];
  }, [topicsQuery.data]);

  const email = useMemo(() => {
    // Prefer API data if available
    if (topicsQuery.data?.email) return topicsQuery.data.email;
    // Fallback to localStorage
    return localData?.email;
  }, [topicsQuery.data, localData]);

  const isLoading = useMemo(() => {
    // Loading if API query is enabled and loading
    if (shouldFetchFromAPI) return topicsQuery.isLoading;
    return false;
  }, [shouldFetchFromAPI, topicsQuery.isLoading]);

  // =====================================================
  // METHODS
  // =====================================================

  const isSubscribedToTopic = useCallback(
    (topic: TopicKey): boolean => {
      return topics.includes(topic);
    },
    [topics],
  );

  const subscribe = useCallback(
    async (params: { email?: string; topic: TopicKey }): Promise<void> => {
      const { email: emailParam, topic } = params;

      if (isRealUser) {
        // Real user: API only (use session email)
        const userEmail = session?.user?.email;
        if (!userEmail) {
          throw new Error("No email found for user");
        }

        await subscribeMutation.mutateAsync({
          email: userEmail,
          topic,
          path:
            typeof window !== "undefined"
              ? window.location.pathname
              : undefined,
        });
      } else {
        // Logged-out/anonymous: Save email to localStorage for pre-filling
        if (emailParam) {
          setLocalData({ email: emailParam });

          // Call API to subscribe
          await subscribeMutation.mutateAsync({
            email: emailParam,
            topic,
            path:
              typeof window !== "undefined"
                ? window.location.pathname
                : undefined,
          });
        }
      }
    },
    [isRealUser, session?.user?.email, subscribeMutation, setLocalData],
  );

  const unsubscribe = useCallback(
    async (topic: TopicKey): Promise<void> => {
      const remainingTopics = topics.filter((t) => t !== topic);

      if (isRealUser) {
        // Real user: update via API using session email
        await updateTopicsMutation.mutateAsync({
          topics: remainingTopics,
        });
      } else if (emailForQuery) {
        // Anonymous user with localStorage email: update via API
        await updateTopicsMutation.mutateAsync({
          topics: remainingTopics,
          email: emailForQuery,
        });
      }
      // No else - can't unsubscribe without email
    },
    [isRealUser, topics, updateTopicsMutation, emailForQuery],
  );

  // =====================================================
  // RETURN
  // =====================================================

  return {
    isLoading,
    topics,
    email,
    isSubscribedToTopic,
    subscribe,
    unsubscribe,
    userState,
  };
}
