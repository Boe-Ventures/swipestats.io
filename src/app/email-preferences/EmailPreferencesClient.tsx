"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/react";
import type { TopicKey } from "@/server/clients/resend.client";

const TOPIC_INFO: Record<TopicKey, { name: string; description: string }> = {
  "newsletter-general": {
    name: "General newsletter",
    description: "Dating tips, product updates, research, and SwipeStats news.",
  },
  "newsletter-dating-tips": {
    name: "Dating tips",
    description: "Practical profile and app strategy notes.",
  },
  "newsletter-product-updates": {
    name: "Product updates",
    description: "New SwipeStats features and product changes.",
  },
  "newsletter-research": {
    name: "Research",
    description: "Dating app data studies and benchmarks.",
  },
  "waitlist-profile-compare": {
    name: "Profile comparisons",
    description: "Launch updates for profile comparison tools.",
  },
  "waitlist-bumble": {
    name: "Bumble support",
    description: "Launch updates for Bumble data support.",
  },
  "waitlist-message-analysis": {
    name: "Message analysis",
    description: "Launch updates for messages and conversations.",
  },
  "waitlist-directory-profiles": {
    name: "Directory profiles",
    description: "Launch updates for directory profile features.",
  },
};

const VISIBLE_TOPICS = Object.keys(TOPIC_INFO) as TopicKey[];

export function EmailPreferencesClient() {
  const token = useSearchParams().get("token") ?? "";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [localTopics, setLocalTopics] = useState<
    Partial<Record<TopicKey, boolean>>
  >({});

  const preferencesQuery = useQuery(
    trpc.newsletter.getPreferencesByToken.queryOptions(
      { token },
      { enabled: token.length > 0, retry: false },
    ),
  );

  const requestLinkMutation = useMutation(
    trpc.newsletter.requestPreferenceLink.mutationOptions({
      onSuccess: () => setRequestSent(true),
    }),
  );

  const updatePreferencesMutation = useMutation(
    trpc.newsletter.updatePreferencesByToken.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newsletter.getPreferencesByToken.queryOptions({ token }),
        );
      },
    }),
  );

  useEffect(() => {
    if (!preferencesQuery.data) return;

    const selected = new Set(preferencesQuery.data.topics);
    setLocalTopics(
      Object.fromEntries(
        VISIBLE_TOPICS.map((topic) => [topic, selected.has(topic)]),
      ),
    );
  }, [preferencesQuery.data]);

  const selectedTopics = useMemo(
    () => VISIBLE_TOPICS.filter((topic) => localTopics[topic] === true),
    [localTopics],
  );

  const hasChanges = useMemo(() => {
    if (!preferencesQuery.data) return false;
    const current = new Set(preferencesQuery.data.topics);
    return VISIBLE_TOPICS.some(
      (topic) => (localTopics[topic] ?? false) !== current.has(topic),
    );
  }, [localTopics, preferencesQuery.data]);

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manage email preferences</CardTitle>
          <CardDescription>
            Enter your email and we will send you a secure preferences link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestSent ? (
            <div className="flex gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 text-green-600" />
              <p>
                If that email can receive SwipeStats updates, a preferences link
                is on its way.
              </p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                requestLinkMutation.mutate({ email });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                loading={requestLinkMutation.isPending}
                disabled={!email}
              >
                <Mail className="size-4" />
                Send preferences link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  if (preferencesQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  if (preferencesQuery.isError || !preferencesQuery.data) {
    return (
      <Card>
        <CardContent className="flex gap-3 py-8 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="font-medium">This link is invalid or expired.</p>
            <p className="text-muted-foreground">
              Request a new preferences link to continue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email preferences</CardTitle>
        <CardDescription>{preferencesQuery.data.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {VISIBLE_TOPICS.map((topic) => {
            const info = TOPIC_INFO[topic];
            return (
              <label
                key={topic}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  checked={localTopics[topic] ?? false}
                  onCheckedChange={(checked) =>
                    setLocalTopics((current) => ({
                      ...current,
                      [topic]: checked === true,
                    }))
                  }
                  className="mt-0.5"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    {info.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {info.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <Button
          onClick={() =>
            updatePreferencesMutation.mutate({ token, topics: selectedTopics })
          }
          loading={updatePreferencesMutation.isPending}
          disabled={!hasChanges}
        >
          Save preferences
        </Button>

        {updatePreferencesMutation.isSuccess && !hasChanges && (
          <p className="text-sm text-green-600">Preferences updated.</p>
        )}
        {updatePreferencesMutation.isError && (
          <p className="text-sm text-destructive">
            {updatePreferencesMutation.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
