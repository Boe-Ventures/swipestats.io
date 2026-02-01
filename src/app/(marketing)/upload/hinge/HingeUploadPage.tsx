"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadLayout } from "../_components/UploadLayout";
import { HingeGuidedUpload } from "./components/HingeGuidedUpload";
import { HingeProfilePreview } from "./components/HingeProfilePreview";
import { HingeSubmitButton } from "./components/HingeSubmitButton";
import { HingeEnhancement } from "./components/HingeEnhancement";
import { HingeTermsCheckbox } from "./components/HingeTermsCheckbox";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { DEFAULT_HINGE_CONSENT } from "@/lib/interfaces/HingeConsent";

interface HingeUploadPageProps {
  isUpdate: boolean;
  isDebug: boolean;
}

export function HingeUploadPage({ isUpdate, isDebug }: HingeUploadPageProps) {
  const [payload, setPayload] = useState<SwipestatsHingeProfilePayload | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<HingeConsentState>(
    DEFAULT_HINGE_CONSENT,
  );
  const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);

  // Fetch profile data after drag-and-drop to check if updating vs creating
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hingeId = payload?.hingeId;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Preemptively fetch profile data (public endpoint, no auth required)
  // This lets users see if they're updating an existing profile before submitting
  const { data: existingProfile } = useQuery({
    ...trpc.hingeProfile.get.queryOptions({ hingeId: hingeId ?? "" }),
    enabled: !!hingeId,
    retry: false,
    staleTime: 60000, // Cache for 1 minute to avoid repeated calls
  });

  const deleteProfileMutation = useMutation(
    trpc.admin.deleteHingeProfile.mutationOptions({
      onSuccess: () => {
        // Invalidate the public profile query so it refetches and returns null
        void queryClient.invalidateQueries(
          trpc.hingeProfile.get.queryOptions({ hingeId: hingeId ?? "" }),
        );
        alert("Profile deleted successfully!");
        setPayload(null); // Reset to upload state
      },
      onError: (error) => {
        alert(`Failed to delete profile: ${error.message}`);
      },
    }),
  );

  // Filter out broken images from payload
  const getFilteredPayload = (): SwipestatsHingeProfilePayload => {
    if (!payload || brokenImageUrls.length === 0) {
      return payload!;
    }

    const brokenUrlsSet = new Set(brokenImageUrls);
    const filteredMedia = Array.isArray(payload.anonymizedHingeJson.Media)
      ? payload.anonymizedHingeJson.Media.filter((mediaItem) => {
          return !brokenUrlsSet.has(mediaItem.url);
        })
      : [];

    return {
      ...payload,
      anonymizedHingeJson: {
        ...payload.anonymizedHingeJson,
        Media: filteredMedia,
      },
    };
  };

  // Before extraction: show centered upload layout
  if (!payload) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Hinge Data" : "Upload Your Hinge Data"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {isUpdate
                ? "Upload new data to update your profile and insights"
                : "Upload your Hinge data files to get personalized insights"}
            </p>
          </div>

          {/* File Upload - Centered */}
          <div className="w-full">
            <HingeGuidedUpload
              onComplete={setPayload}
              onUploadStart={() => setError(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  // After extraction: show two-column layout with success state
  return (
    <UploadLayout
      leftColumn={
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Hinge Data" : "Upload Your Hinge Data"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {isUpdate
                ? "Upload new data to update your profile and insights"
                : "Upload your Hinge data files to get personalized insights"}
            </p>
          </div>

          {/* Enhancement Forms */}
          <HingeEnhancement
            payload={payload}
            consent={consent}
            onConsentChange={setConsent}
          />

          {/* Terms and Conditions */}
          <div className="mt-4">
            <HingeTermsCheckbox
              checked={consent.terms}
              onCheckedChange={(checked) =>
                setConsent({ ...consent, terms: checked })
              }
            />
          </div>

          {/* Submit button */}
          <div className="mt-6">
            <HingeSubmitButton
              payload={getFilteredPayload()}
              isUpdate={isUpdate}
              disabled={!!error}
              consent={consent}
            />
          </div>

          {/* User-facing notification - profile exists */}
          {existingProfile && (
            <div className="mt-6 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-blue-900">
                ℹ️ Updating Existing Profile
              </h3>
              <p className="text-xs text-blue-700">
                This profile already exists. Your data will be updated with the
                latest information.
              </p>
            </div>
          )}

          {/* Dev Admin Card - only visible in development */}
          {isDevelopment && existingProfile && (
            <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-red-900">
                🛠️ Dev Admin Tools
              </h3>
              <p className="mb-3 text-xs text-red-700">
                Profile exists: {existingProfile.hingeId}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/insights/hinge/${existingProfile.hingeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  View Insights →
                </a>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete profile ${existingProfile.hingeId}? This will cascade delete all related data (matches, messages, prompts, blocks, etc.).`,
                      )
                    ) {
                      deleteProfileMutation.mutate({
                        hingeId: existingProfile.hingeId,
                      });
                    }
                  }}
                  disabled={deleteProfileMutation.isPending}
                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteProfileMutation.isPending
                    ? "Deleting..."
                    : "Delete Profile"}
                </button>
              </div>
            </div>
          )}

          {/* Debug Info */}
          {isDebug && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <summary className="cursor-pointer font-mono text-xs">
                Debug: Raw Payload
              </summary>
              <pre className="mt-2 overflow-auto text-xs">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </details>
          )}
        </>
      }
      rightColumn={
        <HingeProfilePreview
          payload={payload}
          consent={consent}
          onBrokenImagesDetected={setBrokenImageUrls}
        />
      }
    />
  );
}
