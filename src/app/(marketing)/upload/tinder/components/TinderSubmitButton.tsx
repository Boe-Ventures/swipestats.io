"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
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
  uploadContext?: {
    scenario:
      | "new_profile"
      | "new_user"
      | "same_tinderId"
      | "different_tinderId"
      | "can_claim"
      | "needs_signin"
      | "owned_by_other";
    identityMismatch?: boolean;
  } | null;
}

export function TinderSubmitButton({
  payload,
  disabled,
  timezone,
  country,
  consent,
  uploadContext,
}: TinderSubmitButtonProps) {
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "processing"
  >("idle");
  const [uploadedBlobUrl, setUploadedBlobUrl] = useState<string | null>(null);

  // Use Better Auth's built-in session hook
  const { data: session } = authClient.useSession();

  const trpc = useTRPC();

  // Mutation options shared across all endpoints
  const mutationOptions = {
    onSuccess: (data: { tinderId: string }) => {
      router.push(`/insights/tinder/${data.tinderId}`);
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
    trpc.profile.createProfile.mutationOptions(mutationOptions),
  );
  const updateMutation = useMutation(
    trpc.profile.updateProfile.mutationOptions(mutationOptions),
  );
  const mergeMutation = useMutation(
    trpc.profile.mergeAccounts.mutationOptions(mutationOptions),
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

    try {
      // Step 1: Ensure session exists
      if (!session) {
        setIsCreatingSession(true);
        const { error } = await authClient.signIn.anonymous({
          fetchOptions: {
            headers: {
              "X-Anonymous-Source": "upload_flow",
            },
          },
        });
        if (error) {
          alert("Failed to create session. Please try again.");
          return;
        }
        setIsCreatingSession(false);
      }

      // Step 2: Upload to blob (skip if already uploaded)
      let blobUrl = uploadedBlobUrl;
      if (!blobUrl) {
        setUploadState("uploading");
        console.log("📤 Uploading to blob storage...");

        // Filter payload based on consent before uploading
        const filteredPayload = filterPayloadByConsent(payload, consent);

        // Create JSON blob
        const jsonBlob = new Blob(
          [JSON.stringify(filteredPayload.anonymizedTinderJson)],
          { type: "application/json" },
        );

        // Upload to Vercel Blob with structured path
        const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const result = await upload(
          `tinder-data/${filteredPayload.tinderId}/${date}/data.json`,
          jsonBlob,
          {
            access: "public",
            handleUploadUrl: "/api/blob/client-upload",
            clientPayload: JSON.stringify({
              resourceType: "tinder_data",
              tinderId: filteredPayload.tinderId,
            }),
          },
        );

        blobUrl = result.url;
        setUploadedBlobUrl(blobUrl);
        console.log("✅ Blob uploaded:", blobUrl);
      } else {
        console.log("♻️ Using cached blob URL:", blobUrl);
      }

      // Step 3: Process profile
      setUploadState("processing");
      const uploadData = {
        tinderId: payload.tinderId,
        blobUrl,
        timezone,
        country,
        consentPhotos: consent.photos,
        consentWork: consent.work,
      };

      // Route to appropriate endpoint based on scenario
      const scenario = uploadContext?.scenario;

      if (scenario === "new_profile" || scenario === "new_user") {
        createMutation.mutate(uploadData);
      } else if (scenario === "same_tinderId" || scenario === "can_claim") {
        updateMutation.mutate(uploadData);
      } else if (scenario === "different_tinderId") {
        mergeMutation.mutate(uploadData);
      } else {
        console.error("Unknown upload scenario:", scenario);
        alert("Unable to determine upload type. Please refresh and try again.");
        setUploadState("idle");
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      if (errorMessage.toLowerCase().includes("upload")) {
        // Blob upload failed - clear cache and show error
        setUploadedBlobUrl(null);
        alert("Upload failed. Please check your connection and try again.");
      } else {
        // Processing failed - keep blob URL cached for retry
        alert("Processing failed. Please try again.");
      }
      setUploadState("idle");
      setIsCreatingSession(false);
    }
  };

  const user = payload.anonymizedTinderJson.User;
  const hasUnknownGender =
    isGenderDataUnknown(user.gender) ||
    isGenderDataUnknown(user.interested_in) ||
    isGenderDataUnknown(user.gender_filter);

  const termsAccepted = consent.terms;
  const hasUploadContext = !!uploadContext?.scenario;
  const canSubmit = !hasUnknownGender && !disabled && termsAccepted && hasUploadContext;
  const isLoading =
    isCreatingSession ||
    uploadState !== "idle" ||
    createMutation.isPending ||
    updateMutation.isPending ||
    mergeMutation.isPending;

  // Determine loading text
  let loadingText = "Upload & View Insights";
  if (uploadState === "uploading") {
    loadingText = "Uploading...";
  } else if (uploadState === "processing") {
    loadingText = "Processing...";
  }

  return (
    <SubmitButton
      onClick={handleSubmit}
      disabled={!canSubmit || isLoading}
      isLoading={isLoading}
    >
      {loadingText}
    </SubmitButton>
  );
}
