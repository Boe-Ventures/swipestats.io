"use client";

import { useState, useMemo, useEffect } from "react";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadLayout } from "../_components/UploadLayout";
import { DevAdminPanel } from "../_components/DevAdminPanel";
import { TinderDataExtractor } from "./components/TinderDataExtractor";
import { TinderProfilePreview } from "./components/TinderProfilePreview";
import { TinderEnhancement } from "./components/TinderEnhancement";
import { TinderSubmitButton } from "./components/TinderSubmitButton";
import { TinderTermsCheckbox } from "./components/TinderTermsCheckbox";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { DEFAULT_TINDER_CONSENT } from "@/lib/interfaces/TinderConsent";
import { isGenderDataUnknown } from "@/lib/utils/gender";
import {
  getBrowserTimezone,
  getCountryFromTimezone,
} from "@/lib/utils/timezone";
import { getTinderObservedUsageRange } from "@/lib/profile.utils";
import { env } from "@/env";

interface TinderUploadPageProps {
  isUpdate: boolean;
  isDebug: boolean;
}

export function TinderUploadPage({ isUpdate, isDebug }: TinderUploadPageProps) {
  const [payload, setPayload] = useState<SwipestatsProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<TinderConsentState>(
    DEFAULT_TINDER_CONSENT,
  );
  const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);

  // Detect timezone and country once on mount
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const browserCountry = useMemo(
    () => getCountryFromTimezone(browserTimezone),
    [browserTimezone],
  );

  // Fetch profile data after drag-and-drop to check if updating vs creating
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const tinderId = payload?.tinderId;
  const birthDate = payload?.anonymizedTinderJson.User.birth_date;
  const createDate = payload?.anonymizedTinderJson.User.create_date;
  const showDevTools = !env.NEXT_PUBLIC_IS_PRODUCTION;

  // Fetch upload context to determine scenario (new/additive/merge)
  const {
    data: uploadContext,
    isFetching: isContextLoading,
    refetch: refetchContext,
  } = useQuery({
    ...trpc.profile.getUploadContext.queryOptions({
      tinderId,
      birthDate,
      createDate,
    }),
    enabled: !!tinderId,
    retry: false,
    staleTime: 60000, // Cache for 1 minute to avoid repeated calls
  });

  useEffect(() => {
    if (tinderId) void refetchContext();
  }, [session?.user.id, tinderId, refetchContext]);

  const deleteProfileMutation = useMutation(
    trpc.admin.deleteProfile.mutationOptions({
      onSuccess: () => {
        // Invalidate queries so they refetch with updated data
        void queryClient.invalidateQueries(
          trpc.profile.get.queryOptions({ tinderId: tinderId ?? "" }),
        );
        void queryClient.invalidateQueries(
          trpc.profile.getUploadContext.queryOptions({
            tinderId,
            birthDate,
            createDate,
          }),
        );
        alert("Profile deleted successfully!");
        setPayload(null); // Reset to upload state
      },
      onError: (error) => {
        alert(`Failed to delete profile: ${error.message}`);
      },
    }),
  );

  // Detect backward merge attempt (uploading older account after already having newer one)
  // tinderMatchId is account-specific (just an integer), so merges must go old → new
  // NOTE: Must be before early return to satisfy Rules of Hooks
  const isBackwardMerge = useMemo(() => {
    if (
      !payload ||
      uploadContext?.scenario !== "different_tinderId" ||
      !uploadContext?.userProfile?.lastDayOnApp
    ) {
      return false;
    }
    const newFileDates = getTinderObservedUsageRange(
      payload.anonymizedTinderJson.Usage,
    );
    const existingLastDay = new Date(uploadContext.userProfile.lastDayOnApp);
    return newFileDates.lastDayOnApp < existingLastDay;
  }, [uploadContext, payload]);

  // When no payload, show centered upload area
  if (!payload) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="dark:text-foreground text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Tinder Data" : "Upload Your Tinder Data"}
            </h1>
            <p className="dark:text-muted-foreground mt-2 text-sm text-gray-600 sm:text-base">
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
            <h1 className="dark:text-foreground text-2xl font-bold text-gray-900 sm:text-3xl">
              {isUpdate ? "Update Your Tinder Data" : "Upload Your Tinder Data"}
            </h1>
            <p className="dark:text-muted-foreground mt-2 text-sm text-gray-600 sm:text-base">
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
              disabled={
                isContextLoading ||
                !!error ||
                isBackwardMerge ||
                (uploadContext?.identityMismatch ?? false)
              }
              timezone={browserTimezone}
              country={browserCountry}
              consent={consent}
              uploadContext={uploadContext}
            />
          </div>

          {(uploadContext?.scenario === "new_user" ||
            uploadContext?.scenario === "new_profile") && (
            <p className="text-muted-foreground mt-4 text-xs">
              This creates a profile in your current SwipeStats account or guest
              session. It does not recover history or purchases from a different
              session. Sign in to your existing account first if you have one.
            </p>
          )}

          {/* User-facing notification - scenario-based */}
          {uploadContext?.scenario === "same_tinderId" && (
            <div className="mt-6 rounded-lg border-2 border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
              <h3 className="mb-1 text-sm font-semibold text-green-900 dark:text-green-200">
                📊 Updating Existing Profile
              </h3>
              <p className="text-xs text-green-700 dark:text-green-400">
                Your insights will be rebuilt from this export. Earlier accepted
                exports stay saved, and your profile link stays the same.
              </p>
              {uploadContext.userProfile && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Existing data:{" "}
                  {new Date(
                    uploadContext.userProfile.firstDayOnApp,
                  ).toLocaleDateString()}{" "}
                  →{" "}
                  {new Date(
                    uploadContext.userProfile.lastDayOnApp,
                  ).toLocaleDateString()}
                </p>
              )}
              {uploadContext.userProfile && (
                <a
                  href={`/insights/tinder/${uploadContext.userProfile.tinderId}`}
                  className="mt-2 inline-block text-xs font-semibold text-green-800 underline underline-offset-4 hover:no-underline dark:text-green-200"
                >
                  Already uploaded? View your insights instead →
                </a>
              )}
            </div>
          )}

          {uploadContext?.scenario === "different_tinderId" &&
            !isBackwardMerge && (
              <div className="mt-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <h3 className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  🔄 Merging Accounts
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  You have an existing profile with a different Tinder ID. This
                  upload will merge your old account data into your new account.
                </p>
              </div>
            )}

          {uploadContext?.scenario === "different_tinderId" &&
            isBackwardMerge && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
                <h3 className="mb-1 text-sm font-semibold text-red-900 dark:text-red-200">
                  ⚠️ Wrong Order - Older Account Detected
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  This file is from an older Tinder account than your current
                  profile. Account merges must go from older → newer to avoid
                  data issues.
                </p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Contact support to review the older export without deleting
                  your current profile or its saved history.
                </p>
                {uploadContext.userProfile && (
                  <p className="mt-2 text-xs text-red-500">
                    Your profile ends:{" "}
                    {new Date(
                      uploadContext.userProfile.lastDayOnApp,
                    ).toLocaleDateString()}
                    <br />
                    This file ends:{" "}
                    {getTinderObservedUsageRange(
                      payload.anonymizedTinderJson.Usage,
                    ).lastDayOnApp.toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

          {uploadContext?.scenario === "different_tinderId" &&
            uploadContext?.identityMismatch && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
                <h3 className="mb-1 text-sm font-semibold text-red-900 dark:text-red-200">
                  ⚠️ Identity Mismatch Detected
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  This export has a different birth date from your saved Tinder
                  profile, so it cannot be merged automatically.
                </p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Check that you selected your own export and signed in to the
                  intended SwipeStats account, or contact support.
                </p>
              </div>
            )}

          {/* Dev Admin Card - visible on localhost and preview deployments, hidden on production */}
          {showDevTools &&
            uploadContext &&
            uploadContext.scenario !== "new_user" &&
            uploadContext.scenario !== "new_profile" && (
              <DevAdminPanel
                provider="tinder"
                uploadContext={uploadContext}
                deleteProfileMutation={
                  deleteProfileMutation as unknown as Parameters<
                    typeof DevAdminPanel
                  >[0]["deleteProfileMutation"]
                }
              />
            )}

          {/* Debug Info */}
          {isDebug && (
            <details className="dark:border-border dark:bg-background rounded-lg border border-gray-200 bg-gray-50 p-4">
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
