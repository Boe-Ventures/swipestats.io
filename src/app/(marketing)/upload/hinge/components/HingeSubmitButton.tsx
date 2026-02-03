"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "../../_components/SubmitButton";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { authClient } from "@/server/better-auth/client";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { filterPayloadByConsent } from "@/lib/utils/filterHingePayload";
import {
  getBrowserTimezone,
  getCountryFromTimezone,
} from "@/lib/utils/timezone";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

interface HingeSubmitButtonProps {
  payload: SwipestatsHingeProfilePayload;
  isUpdate: boolean;
  disabled?: boolean;
  consent: HingeConsentState;
  uploadContext?: {
    scenario:
      | "new_profile"
      | "new_user"
      | "same_hingeId"
      | "different_hingeId"
      | "can_claim"
      | "needs_signin"
      | "owned_by_other";
    identityMismatch?: boolean;
  } | null;
}

export function HingeSubmitButton({
  payload,
  isUpdate,
  disabled,
  consent,
  uploadContext,
}: HingeSubmitButtonProps) {
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Use Better Auth's built-in session hook
  const { data: session } = authClient.useSession();

  // Detect timezone and country once on mount
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const browserCountry = useMemo(
    () => getCountryFromTimezone(browserTimezone),
    [browserTimezone],
  );

  const trpc = useTRPC();

  // Mutation options shared across all endpoints
  const mutationOptions = {
    onSuccess: (data: { hingeId: string }) => {
      router.push(`/insights/hinge/${data.hingeId}`);
    },
    onError: (error: { message?: string }) => {
      console.error("Error uploading profile:", error);
      const message =
        error.message || "Failed to upload profile. Please try again.";
      alert(message);
    },
  };

  // Three separate mutations for each endpoint
  const createMutation = useMutation(
    trpc.hingeProfile.createProfile.mutationOptions(mutationOptions),
  );
  const updateMutation = useMutation(
    trpc.hingeProfile.updateProfile.mutationOptions(mutationOptions),
  );
  const mergeMutation = useMutation(
    trpc.hingeProfile.mergeAccounts.mutationOptions(mutationOptions),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Track submit click
    const photoCount = Array.isArray(payload.anonymizedHingeJson.Media)
      ? payload.anonymizedHingeJson.Media.length
      : 0;
    const hasPhotosData = photoCount > 0;

    trackEvent("upload_submit_clicked", {
      provider: "hinge",
      hingeId: payload.hingeId,
      photoCount: consent.sharePhotos ? photoCount : 0, // 0 if no consent
      hasPhotos: hasPhotosData,
      hasPhotosConsent: consent.sharePhotos,
      matchCount: payload.anonymizedHingeJson.Matches.length,
      scenario: uploadContext?.scenario || "unknown",
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

    const uploadData = {
      hingeId: filteredPayload.hingeId,
      anonymizedHingeJson: filteredPayload.anonymizedHingeJson,
      timezone: browserTimezone,
      country: browserCountry,
    };

    // Route to appropriate endpoint based on scenario
    const scenario = uploadContext?.scenario;

    if (scenario === "new_profile" || scenario === "new_user") {
      // First-time upload - use streamlined createProfile endpoint
      createMutation.mutate(uploadData);
    } else if (scenario === "same_hingeId" || scenario === "can_claim") {
      // Re-uploading same account or claiming anonymous profile
      updateMutation.mutate(uploadData);
    } else if (scenario === "different_hingeId") {
      // Merging old Hinge account into new one
      mergeMutation.mutate(uploadData);
    } else {
      // Fallback for legacy flow without uploadContext
      // Determine based on isUpdate prop
      if (isUpdate && session) {
        updateMutation.mutate(uploadData);
      } else {
        createMutation.mutate(uploadData);
      }
    }
  };

  const termsAccepted = consent.terms;
  const canSubmit = !disabled && termsAccepted;
  const isLoading =
    isCreatingSession ||
    createMutation.isPending ||
    updateMutation.isPending ||
    mergeMutation.isPending;

  return (
    <SubmitButton
      onClick={handleSubmit}
      disabled={!canSubmit || isLoading}
      isLoading={isLoading}
    >
      {isUpdate ? "Update Profile" : "Upload & View Insights"}
    </SubmitButton>
  );
}
