"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  expandsSwipeRankDescriptorDisclosure,
  requiresSwipeRankPublicationConsent,
} from "@/lib/swipe-rank/publication-consent";
import { useTRPC } from "@/trpc/react";

interface PublicationPreferences {
  alias: string;
  showGender: boolean;
  showAgeBand: boolean;
  showInterestedIn: boolean;
  locationGranularity: "NONE" | "COUNTRY" | "REGION" | "CITY";
}

const PRIVATE_DEFAULTS: PublicationPreferences = {
  alias: "Anonymous dater",
  showGender: false,
  showAgeBand: false,
  showInterestedIn: false,
  locationGranularity: "NONE",
};

export function SwipeRankPublicationControl({
  tinderId,
}: {
  tinderId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const publication = useQuery(
    trpc.swipeRank.publication.queryOptions(
      { tinderId },
      { refetchOnWindowFocus: false },
    ),
  );
  const [preferences, setPreferences] =
    useState<PublicationPreferences>(PRIVATE_DEFAULTS);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!publication.data) return;
    setConsent(false);
    setPreferences({
      alias: publication.data.alias,
      showGender: publication.data.showGender,
      showAgeBand: publication.data.showAgeBand,
      showInterestedIn: publication.data.showInterestedIn,
      locationGranularity: publication.data.locationGranularity,
    });
  }, [publication.data]);

  const updatePublication = useMutation(
    trpc.swipeRank.updatePublication.mutationOptions({
      onSuccess: () => {
        setConsent(false);
        void queryClient.invalidateQueries(
          trpc.swipeRank.publication.queryOptions({ tinderId }),
        );
        toast.success("Your SwipeRank publication settings are live.");
      },
      onError: (error) => {
        toast.error(error.message || "Could not update SwipeRank privacy.");
      },
    }),
  );
  const revokePublication = useMutation(
    trpc.swipeRank.revokePublication.mutationOptions({
      onSuccess: () => {
        setConsent(false);
        void queryClient.invalidateQueries(
          trpc.swipeRank.publication.queryOptions({ tinderId }),
        );
        toast.success("Your SwipeRank is private again.");
      },
      onError: (error) => {
        toast.error(error.message || "Could not make SwipeRank private.");
      },
    }),
  );

  if (publication.isLoading) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm">
        Loading publication settings…
      </div>
    );
  }

  if (!publication.data || publication.isError) {
    return null;
  }

  const isPublic = publication.data.status === "PUBLIC";
  const expandsDescriptorDisclosure =
    isPublic &&
    expandsSwipeRankDescriptorDisclosure(publication.data, preferences);
  const requiresExplicitConsent = requiresSwipeRankPublicationConsent(
    publication.data.status,
    publication.data,
    preferences,
  );
  const canSubmit =
    preferences.alias.trim().length > 0 &&
    (!requiresExplicitConsent || consent) &&
    publication.data.canPublish;

  function updatePreference<Key extends keyof PublicationPreferences>(
    key: Key,
    value: PublicationPreferences[Key],
  ) {
    setConsent(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="rounded-xl border bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Eye className="h-4 w-4 text-emerald-600" />
            ) : (
              <EyeOff className="text-muted-foreground h-4 w-4" />
            )}
            <h3 className="font-semibold">Public leaderboard</h3>
            <Badge variant={isPublic ? "default" : "secondary"}>
              {isPublic ? "Published" : "Private"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            Existing profiles are private by default. If you opt in, your alias,
            exact rank, rounded match yield, and selected descriptors can appear
            for every period where you qualify. Tinder ID, account ID, raw
            totals, files, and images are never included. Even so, your alias,
            exact stats, and descriptor combination may be correlated with
            existing public anonymized insights or information shared elsewhere
            and could make you recognizable.
          </p>
        </div>
        <ButtonLink href="/leaderboard" variant="outline" size="sm">
          View leaderboard
        </ButtonLink>
      </div>

      {!publication.data.canPublish && !isPublic ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Claim this anonymous account before publishing. Your private rank is
            already available; publishing is optional. You can finish claiming
            the account from your dashboard or account settings.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-2">
              <Label htmlFor="swipe-rank-alias">Public alias</Label>
              <Input
                id="swipe-rank-alias"
                value={preferences.alias}
                maxLength={40}
                onChange={(event) =>
                  updatePreference("alias", event.target.value)
                }
                placeholder="Anonymous dater"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swipe-rank-location">Share location</Label>
              <Select
                value={preferences.locationGranularity}
                onValueChange={(value) =>
                  updatePreference(
                    "locationGranularity",
                    value as PublicationPreferences["locationGranularity"],
                  )
                }
              >
                <SelectTrigger id="swipe-rank-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Do not share</SelectItem>
                  <SelectItem value="COUNTRY">Country</SelectItem>
                  <SelectItem value="REGION">Region and country</SelectItem>
                  <SelectItem value="CITY">
                    City, region, and country
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DescriptorSwitch
              id="swipe-rank-gender"
              label="Share gender"
              checked={preferences.showGender}
              onCheckedChange={(checked) =>
                updatePreference("showGender", checked)
              }
            />
            <DescriptorSwitch
              id="swipe-rank-age"
              label="Share age band"
              checked={preferences.showAgeBand}
              onCheckedChange={(checked) =>
                updatePreference("showAgeBand", checked)
              }
            />
            <DescriptorSwitch
              id="swipe-rank-interest"
              label="Share interested in"
              checked={preferences.showInterestedIn}
              onCheckedChange={(checked) =>
                updatePreference("showInterestedIn", checked)
              }
            />
          </div>

          {requiresExplicitConsent && (
            <div className="flex items-start gap-3 rounded-lg border bg-white p-4">
              <Checkbox
                id="swipe-rank-consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
              />
              <Label
                htmlFor="swipe-rank-consent"
                className="cursor-pointer text-sm leading-5 font-normal"
              >
                {expandsDescriptorDisclosure
                  ? "I renew my explicit consent to reveal the additional descriptors selected above. "
                  : "I choose to publish my eligible SwipeRank entries and the descriptors selected above. "}
                I understand that exact stats and descriptors may be correlated
                with other public information, that the leaderboard is public,
                and that I can revoke this consent at any time.
              </Label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              loading={updatePublication.isPending}
              disabled={!canSubmit || revokePublication.isPending}
              onClick={() =>
                updatePublication.mutate({
                  tinderId,
                  consentToPublicRanking: consent,
                  preferences,
                })
              }
            >
              {isPublic ? "Save public settings" : "Publish my SwipeRank"}
            </Button>
            {isPublic && (
              <Button
                variant="outline"
                loading={revokePublication.isPending}
                disabled={updatePublication.isPending}
                onClick={() => revokePublication.mutate({ tinderId })}
              >
                Make private
              </Button>
            )}
            <p className="text-muted-foreground text-xs">
              Consent version {publication.data.consentVersion ?? 1}. Read our{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function DescriptorSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
