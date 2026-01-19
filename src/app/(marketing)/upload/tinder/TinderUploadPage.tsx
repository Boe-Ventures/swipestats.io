"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadLayout } from "../_components/UploadLayout";
import { TinderDataExtractor } from "./components/TinderDataExtractor";
import { TinderProfilePreview } from "./components/TinderProfilePreview";
import { TinderEnhancement } from "./components/TinderEnhancement";
import { TinderSubmitButton } from "./components/TinderSubmitButton";
import { TinderTermsCheckbox } from "./components/TinderTermsCheckbox";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { DEFAULT_TINDER_CONSENT } from "@/lib/interfaces/TinderConsent";
import { isGenderDataUnknown } from "@/lib/utils/gender";
import type { TinderJsonGender } from "@/server/db/constants";
import {
  getBrowserTimezone,
  getCountryFromTimezone,
} from "@/lib/utils/timezone";

interface TinderUploadPageProps {
  isUpdate: boolean;
  isDebug: boolean;
  session: null; // Not used anymore, kept for type compatibility
}

export function TinderUploadPage({
  isUpdate,
  isDebug,
  session: _session,
}: TinderUploadPageProps) {
  const [payload, setPayload] = useState<SwipestatsProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<TinderConsentState>(
    DEFAULT_TINDER_CONSENT,
  );
  const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);

  // Use Better Auth's built-in session hook
  const { data: session } = authClient.useSession();

  // Detect timezone and country once on mount
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const browserCountry = useMemo(
    () => getCountryFromTimezone(browserTimezone),
    [browserTimezone],
  );

  // Fetch profile data after drag-and-drop to check if updating vs creating
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tinderId = payload?.tinderId;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Preemptively fetch profile data (public endpoint, no auth required)
  // This lets users see if they're updating an existing profile before submitting
  const { data: existingProfile } = useQuery({
    ...trpc.profile.get.queryOptions({ tinderId: tinderId ?? "" }),
    enabled: !!tinderId,
    retry: false,
    staleTime: 60000, // Cache for 1 minute to avoid repeated calls
  });

  const deleteProfileMutation = useMutation(
    trpc.admin.deleteProfile.mutationOptions({
      onSuccess: () => {
        // Invalidate the public profile query so it refetches and returns null
        void queryClient.invalidateQueries(
          trpc.profile.get.queryOptions({ tinderId: tinderId ?? "" }),
        );
        alert("Profile deleted successfully!");
        setPayload(null); // Reset to upload state
      },
      onError: (error) => {
        alert(`Failed to delete profile: ${error.message}`);
      },
    }),
  );

  // When no payload, show centered upload area
  if (!payload) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Tinder Data" : "Upload Your Tinder Data"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {isUpdate
                ? "Upload new data to update your profile and insights"
                : "Upload your Tinder data to get personalized insights"}
            </p>
          </div>

          {/* File Upload - Centered */}
          <div className="w-full max-w-2xl">
            <TinderDataExtractor onExtracted={setPayload} onError={setError} />
          </div>
        </div>
      </div>
    );
  }

  // Check if gender confirmation is needed
  const user = payload.anonymizedTinderJson.User;
  const needsGender =
    isGenderDataUnknown(user.gender) ||
    isGenderDataUnknown(user.interested_in) ||
    isGenderDataUnknown(user.gender_filter);

  // Filter out broken images from payload
  const getFilteredPayload = (): SwipestatsProfilePayload => {
    if (!payload || brokenImageUrls.length === 0) {
      return payload;
    }

    const brokenUrlsSet = new Set(brokenImageUrls);
    const originalPhotos = payload.anonymizedTinderJson.Photos;

    // Type-safe filtering that maintains the original array type
    const filteredPhotos = Array.isArray(originalPhotos)
      ? (originalPhotos.filter((photo) => {
          const url = typeof photo === "string" ? photo : photo.url;
          return !brokenUrlsSet.has(url);
        }) as typeof originalPhotos)
      : [];

    return {
      ...payload,
      anonymizedTinderJson: {
        ...payload.anonymizedTinderJson,
        Photos: filteredPhotos,
      },
    };
  };

  // When payload exists, show two-column layout with preview
  return (
    <UploadLayout
      leftColumn={
        <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Tinder Data" : "Upload Your Tinder Data"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {isUpdate
                ? "Upload new data to update your profile and insights"
                : "Upload your Tinder data to get personalized insights"}
            </p>
          </div>

          {/* Enhancement Forms */}
          <TinderEnhancement
            payload={payload}
            onUpdate={setPayload}
            consent={consent}
            onConsentChange={setConsent}
          />

          {/* Terms and Conditions - only show after gender is confirmed */}
          {!needsGender && (
            <div className="mt-4">
              <TinderTermsCheckbox
                checked={consent.terms}
                onCheckedChange={(checked) =>
                  setConsent({ ...consent, terms: checked })
                }
              />
            </div>
          )}

          {/* Submit Button - always visible */}
          <div className="mt-6">
            <TinderSubmitButton
              payload={getFilteredPayload()}
              disabled={!!error}
              session={session}
              timezone={browserTimezone}
              country={browserCountry}
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
                Profile exists: {existingProfile.tinderId}
              </p>
              <div className="mb-3 flex flex-col gap-2">
                <Link
                  href={`/insights/tinder/${existingProfile.tinderId}`}
                  className="rounded bg-blue-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700"
                >
                  View New Insights Page
                </Link>
                <Link
                  href={`/insights/tinder/${existingProfile.tinderId}/classic`}
                  className="rounded bg-purple-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-purple-700"
                >
                  View Classic Insights Page
                </Link>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Delete profile ${existingProfile.tinderId}? This will cascade delete all related data (matches, messages, usage, etc.).`,
                    )
                  ) {
                    deleteProfileMutation.mutate({
                      tinderId: existingProfile.tinderId,
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
        <TinderProfilePreview
          payload={payload}
          consent={consent}
          onBrokenImagesDetected={setBrokenImageUrls}
        />
      }
    />
  );
}
