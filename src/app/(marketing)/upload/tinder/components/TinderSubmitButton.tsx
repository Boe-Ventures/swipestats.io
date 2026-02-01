"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "../../_components/SubmitButton";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import { authClient } from "@/server/better-auth/client";
import { isGenderDataUnknown } from "@/lib/utils/gender";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { filterPayloadByConsent } from "@/lib/utils/filterTinderPayload";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

interface TinderSubmitButtonProps {
  payload: SwipestatsProfilePayload;
  disabled?: boolean;
  timezone?: string;
  country?: string;
  consent: TinderConsentState;
}

export function TinderSubmitButton({
  payload,
  disabled,
  timezone,
  country,
  consent,
}: TinderSubmitButtonProps) {
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Use Better Auth's built-in session hook
  const { data: session } = authClient.useSession();

  const trpc = useTRPC();
  const uploadMutation = useMutation(
    trpc.profile.upload.mutationOptions({
      onSuccess: (data) => {
        router.push(`/insights/tinder/${data.tinderId}`);
      },
      onError: (error) => {
        console.error("Error uploading profile:", error);
        alert("Failed to upload profile. Please try again.");
      },
    }),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Track submit click
    const photoCount = Array.isArray(payload.anonymizedTinderJson.Photos)
      ? payload.anonymizedTinderJson.Photos.length
      : 0;
    const hasPhotosData = photoCount > 0;
    const hasWorkData = !!payload.anonymizedTinderJson.User.jobs?.[0];
    
    trackEvent("upload_submit_clicked", {
      provider: "tinder",
      tinderId: payload.tinderId,
      photoCount: consent.photos ? photoCount : 0, // 0 if no consent
      hasPhotos: hasPhotosData,
      hasPhotosConsent: consent.photos,
      hasWork: hasWorkData,
      hasWorkConsent: consent.work,
      matchCount: payload.anonymizedTinderJson.Messages.length,
    });

    // Ensure session exists before submitting
    if (!session) {
      setIsCreatingSession(true);
      try {
        const { error } = await authClient.signIn.anonymous({
          fetchOptions: {
            headers: {
              "X-Anonymous-Source": "upload_flow",
            },
          },
        });
        if (error) {
          alert("Failed to create session. Please try again.");
          setIsCreatingSession(false);
          return;
        }
        // Session cookie is now set, server will pick it up
        // We can proceed with mutation - the session will be available server-side
      } catch (err) {
        console.error("Session creation error:", err);
        alert("Failed to create session. Please try again.");
        setIsCreatingSession(false);
        return;
      } finally {
        setIsCreatingSession(false);
      }
    }

    // Filter payload based on consent before uploading
    const filteredPayload = filterPayloadByConsent(payload, consent);

    // Proceed with unified upload mutation (handles create/update/transfer automatically)
    uploadMutation.mutate({
      tinderId: filteredPayload.tinderId,
      anonymizedTinderJson: filteredPayload.anonymizedTinderJson,
      timezone,
      country,
    });
  };

  const user = payload.anonymizedTinderJson.User;
  const hasUnknownGender =
    isGenderDataUnknown(user.gender) ||
    isGenderDataUnknown(user.interested_in) ||
    isGenderDataUnknown(user.gender_filter);

  const termsAccepted = consent.terms;
  const canSubmit = !hasUnknownGender && !disabled && termsAccepted;
  const isLoading = isCreatingSession || uploadMutation.isPending;

  return (
    <SubmitButton
      onClick={handleSubmit}
      disabled={!canSubmit || isLoading}
      isLoading={isLoading}
    >
      Upload & View Insights
    </SubmitButton>
  );
}
