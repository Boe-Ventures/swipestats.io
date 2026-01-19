"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, Loader2, Info } from "lucide-react";
import { useNewsletter } from "@/hooks/useNewsletter";
import { authClient } from "@/server/better-auth/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TopicKey } from "@/server/clients/resend.client";

const TOPIC_INFO: Record<TopicKey, { name: string; description: string }> = {
  "newsletter-general": {
    name: "General Newsletter",
    description:
      "Dating tips, product updates, research, and other SwipeStats content",
  },
  "waitlist-profile-compare": {
    name: "Profile Comparisons",
    description: "Get notified when Profile Comparison feature launches",
  },
  "waitlist-bumble": {
    name: "Bumble Support",
    description: "Get notified when Bumble integration is available",
  },
  "waitlist-message-analysis": {
    name: "Message Analysis",
    description: "Get notified when Messages & Conversations feature launches",
  },
  // Not shown in form UI (yet)
  "newsletter-dating-tips": {
    name: "Dating Tips",
    description: "Weekly dating tips",
  },
  "newsletter-product-updates": {
    name: "Product Updates",
    description: "New features",
  },
  "newsletter-research": {
    name: "Research",
    description: "Studies and statistics",
  },
  "waitlist-directory-profiles": {
    name: "Directory Profiles",
    description: "Get notified when Directory Profiles feature launches",
  },
};

// Topics to show in the form
const VISIBLE_TOPICS: TopicKey[] = [
  "newsletter-general",
  "waitlist-profile-compare",
  "waitlist-bumble",
  "waitlist-message-analysis",
];

export function NewsletterPreferencesForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [localTopics, setLocalTopics] = useState<
    Partial<Record<TopicKey, boolean>>
  >({});
  const { data: session } = authClient.useSession();

  // Get localStorage email for anonymous users
  const { email: localStorageEmail } = useNewsletter({ autoFetch: false });
  const isAnonymous = session?.user?.email?.includes(
    "@anonymous.swipestats.io",
  );

  // For anonymous users with localStorage email, pass it to the query
  const queryInput =
    isAnonymous && localStorageEmail ? { email: localStorageEmail } : undefined;

  const topicsQuery = useQuery(
    trpc.newsletter.getMyTopics.queryOptions(queryInput, {
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }),
  );

  const updateTopicsMutation = useMutation(
    trpc.newsletter.updateMyTopics.mutationOptions({
      onSuccess: () => {
        toast.success("Preferences updated successfully");
        // Invalidate all instances of the getMyTopics query globally
        void queryClient.invalidateQueries({
          queryKey: [["newsletter", "getMyTopics"]],
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update preferences");
      },
    }),
  );

  // Initialize local state when data loads
  const topicsData = topicsQuery.data;

  useEffect(() => {
    if (topicsData) {
      const initialTopics: Partial<Record<TopicKey, boolean>> = {};
      VISIBLE_TOPICS.forEach((topic) => {
        (initialTopics as Record<TopicKey, boolean | undefined>)[topic] =
          (topicsData.topics as TopicKey[] | undefined)?.includes(topic) ??
          false;
      });
      setLocalTopics(initialTopics);
    }
  }, [topicsData]);

  const handleToggle = (topic: TopicKey) => {
    setLocalTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  };

  const handleSave = () => {
    const selectedTopics = Object.entries(localTopics)
      .filter(([_, enabled]) => enabled)
      .map(([topic]) => topic as TopicKey);

    // For anonymous users, pass the localStorage email
    // Cast to the expected API type (excludes "waitlist-directory-profiles")
    const mutationInput =
      isAnonymous && localStorageEmail
        ? {
            topics: selectedTopics,
            email: localStorageEmail,
          }
        : {
            topics: selectedTopics,
          };

    updateTopicsMutation.mutate(mutationInput);
  };

  const hasChanges =
    Object.keys(localTopics).length > 0 &&
    topicsData &&
    (Object.keys(localTopics) as TopicKey[]).some((topic) => {
      const enabled = localTopics[topic];
      return (
        enabled !==
        ((topicsData.topics as TopicKey[] | undefined)?.includes(topic) ??
          false)
      );
    });

  if (topicsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!topicsData?.isSubscribed && topicsData?.email) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
          <Mail className="text-muted-foreground h-6 w-6" />
        </div>
        <div>
          <p className="font-medium">Not subscribed</p>
          <p className="text-muted-foreground text-sm">
            You&apos;re not currently subscribed to our newsletter
          </p>
        </div>
        <Button
          onClick={() => {
            // Trigger subscribe with all visible topics
            updateTopicsMutation.mutate({
              topics: VISIBLE_TOPICS,
            });
          }}
          disabled={updateTopicsMutation.isPending}
        >
          Subscribe to Newsletter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Newsletter Email Address - Show for anonymous users */}
      {isAnonymous && localStorageEmail && (
        <div className="space-y-2">
          <Label>Newsletter Email Address</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="bg-muted flex-1 rounded px-2 py-1 text-sm break-all">
              {localStorageEmail}
            </code>
            {topicsQuery.data && (
              <div className="flex shrink-0 items-center gap-1 text-xs text-green-600">
                <Info className="h-4 w-4" />
                Synced with Resend
              </div>
            )}
          </div>
          <Alert variant="info" className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This email is saved locally on this device. Upgrade your account
              to manage preferences across all devices.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Topics Selection */}
      <div className="space-y-3">
        {VISIBLE_TOPICS.map((topic) => {
          const info = TOPIC_INFO[topic];
          return (
            <div key={topic} className="flex items-start gap-3">
              <Checkbox
                id={topic}
                checked={localTopics[topic] ?? false}
                onCheckedChange={() => handleToggle(topic)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <Label
                  htmlFor={topic}
                  className="cursor-pointer text-sm font-medium"
                >
                  {info.name}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {info.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button - Always visible like other forms */}
      <Button
        onClick={handleSave}
        disabled={!hasChanges || updateTopicsMutation.isPending}
      >
        {updateTopicsMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>

      <p className="text-muted-foreground text-xs">
        You can manage your email preferences at any time. Unsubscribing from
        all topics will remove you from our mailing list.
      </p>
    </div>
  );
}
