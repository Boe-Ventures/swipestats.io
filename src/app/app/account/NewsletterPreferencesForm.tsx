"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/form-new";
import { toast } from "sonner";
import { Mail, Loader2, Info } from "lucide-react";
import { useNewsletter } from "@/hooks/useNewsletter";
import { authClient } from "@/server/better-auth/client";
import { isAnonymousEmail } from "@/lib/utils/auth";
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
  const [preferenceEmail, setPreferenceEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const { data: session } = authClient.useSession();

  // Get localStorage email for anonymous users
  const { email: localStorageEmail } = useNewsletter({ autoFetch: false });
  const isAnonymous = session?.user?.email
    ? isAnonymousEmail(session.user.email)
    : false;
  const isRealUser = !!session?.user?.email && !isAnonymous;

  const topicsQuery = useQuery(
    trpc.newsletter.getMyTopics.queryOptions(undefined, {
      enabled: isRealUser,
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

  const requestPreferenceLinkMutation = useMutation(
    trpc.newsletter.requestPreferenceLink.mutationOptions({
      onSuccess: () => setRequestSent(true),
      onError: (error) => {
        toast.error(error.message || "Failed to request preferences link");
      },
    }),
  );

  useEffect(() => {
    if (localStorageEmail && !preferenceEmail) {
      setPreferenceEmail(localStorageEmail);
    }
  }, [localStorageEmail, preferenceEmail]);

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

    updateTopicsMutation.mutate({ topics: selectedTopics });
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

  if (!isRealUser) {
    return (
      <div className="space-y-4">
        {requestSent ? (
          <Alert variant="success">
            <Info className="h-4 w-4" />
            <AlertDescription>
              If that email can receive SwipeStats updates, a preferences link
              is on its way.
            </AlertDescription>
          </Alert>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              requestPreferenceLinkMutation.mutate({ email: preferenceEmail });
            }}
          >
            <div className="space-y-2">
              <FieldLabel>Email address</FieldLabel>
              <Input
                type="email"
                value={preferenceEmail}
                onChange={(event) => setPreferenceEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <Button
              type="submit"
              loading={requestPreferenceLinkMutation.isPending}
              disabled={!preferenceEmail}
            >
              Send preferences link
            </Button>
          </form>
        )}

        {localStorageEmail && (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertDescription>
              {localStorageEmail} is saved on this device for form prefilling.
              For security, preference changes now use an emailed link.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

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
      {/* Topics Selection */}
      <div className="space-y-3">
        {VISIBLE_TOPICS.map((topic) => {
          const info = TOPIC_INFO[topic];
          return (
            <Field key={topic} orientation="horizontal" className="items-start gap-3">
              <Checkbox
                id={topic}
                checked={localTopics[topic] ?? false}
                onCheckedChange={() => handleToggle(topic)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-0.5">
                <FieldLabel
                  htmlFor={topic}
                  className="cursor-pointer"
                >
                  {info.name}
                </FieldLabel>
                <FieldDescription className="text-xs">
                  {info.description}
                </FieldDescription>
              </div>
            </Field>
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
