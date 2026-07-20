"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { SubmitButton } from "../../_components/SubmitButton";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { authClient } from "@/server/better-auth/client";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import {
  getBrowserTimezone,
  getCountryFromTimezone,
} from "@/lib/utils/timezone";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { shouldReuseTransientUpload } from "@/lib/upload/transient-upload";
import {
  canReuseHingeTransientUpload,
  prepareHingeTransientUpload,
} from "@/lib/upload/hinge-transient-upload";
import { transientDataBlobPath } from "@/lib/blob-paths";

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
      | "needs_signin"
      | "owned_by_other";
    identityMismatch?: boolean;
  } | null;
}

export function HingeSubmitButton({
  payload,
  isUpdate: _isUpdate,
  disabled,
  consent,
  uploadContext,
}: HingeSubmitButtonProps) {
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "processing"
  >("idle");
  const [uploadedBlob, setUploadedBlob] = useState<{
    uploadId: string;
    url: string;
    payloadKey: string;
  } | null>(null);

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
    onError: (error: { message?: string; data?: { code?: string } | null }) => {
      if (!shouldReuseTransientUpload(error)) setUploadedBlob(null);
      setUploadState("idle");
      setIsCreatingSession(false);
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

  const scenario = uploadContext?.scenario;
  const isActionableScenario =
    scenario === "new_profile" ||
    scenario === "new_user" ||
    scenario === "same_hingeId" ||
    scenario === "different_hingeId";

  const handleSubmit = async () => {
    // The button is already disabled while loading; this guards the function
    // itself against a same-frame double-fire before the disabled state applies.
    if (!canSubmit || isLoading) return;
    // Never create a session or public transport blob for a state that cannot
    // reach a processing endpoint (for example owned_by_other/needs_signin).
    if (!isActionableScenario) return;

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
          setIsCreatingSession(false);
          alert("Failed to create session. Please try again.");
          return;
        }
        setIsCreatingSession(false);
      }

      // Step 2: Upload to blob (skip only for an exact payload retry).
      const preparedUpload = prepareHingeTransientUpload(payload, consent);
      let blobUrl = canReuseHingeTransientUpload(
        uploadedBlob?.payloadKey,
        preparedUpload.payloadKey,
      )
        ? uploadedBlob!.url
        : null;
      const uploadId = blobUrl ? uploadedBlob!.uploadId : crypto.randomUUID();
      if (!blobUrl) {
        setUploadState("uploading");
        console.log("📤 Uploading to blob storage...");

        // Create JSON blob
        const jsonBlob = new Blob([preparedUpload.blobBody], {
          type: "application/json",
        });

        // Upload to Vercel Blob with structured path
        const result = await upload(
          transientDataBlobPath("hinge", preparedUpload.hingeId, uploadId),
          jsonBlob,
          {
            access: "public",
            handleUploadUrl: "/api/blob/client-upload",
            clientPayload: JSON.stringify({
              resourceType: "hinge_data",
              hingeId: preparedUpload.hingeId,
              uploadId,
            }),
          },
        );

        blobUrl = result.url;
        setUploadedBlob({
          uploadId,
          url: blobUrl,
          payloadKey: preparedUpload.payloadKey,
        });
        console.log("✅ Hinge data uploaded to blob storage");
      } else {
        console.log("♻️ Reusing the matching Hinge upload for retry");
      }

      // Step 3: Process profile
      setUploadState("processing");
      const uploadData = {
        hingeId: payload.hingeId,
        uploadId,
        blobUrl,
        timezone: browserTimezone,
        country: browserCountry,
        consentPhotos: consent.sharePhotos,
        consentWork: consent.shareWorkInfo,
      };

      // Route to appropriate endpoint based on scenario
      if (scenario === "new_profile" || scenario === "new_user") {
        createMutation.mutate(uploadData);
      } else if (scenario === "same_hingeId") {
        updateMutation.mutate(uploadData);
      } else if (scenario === "different_hingeId") {
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
        setUploadedBlob(null);
        alert("Upload failed. Please check your connection and try again.");
      } else {
        // Processing failed - keep blob URL cached for retry
        alert("Processing failed. Please try again.");
      }
      setUploadState("idle");
      setIsCreatingSession(false);
    }
  };

  const termsAccepted = consent.terms;
  const canSubmit = !disabled && termsAccepted && isActionableScenario;
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
