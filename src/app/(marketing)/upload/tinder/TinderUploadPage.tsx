"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import {
  getBrowserTimezone,
  getCountryFromTimezone,
} from "@/lib/utils/timezone";
import { getFirstAndLastDayOnApp } from "@/lib/profile.utils";
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
  const tinderId = payload?.tinderId;
  const birthDate = payload?.anonymizedTinderJson.User.birth_date;
  const showDevTools = !env.NEXT_PUBLIC_IS_PRODUCTION;

  // Fetch upload context to determine scenario (new/additive/merge)
  const { data: uploadContext } = useQuery({
    ...trpc.profile.getUploadContext.queryOptions({ tinderId, birthDate }),
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
    const newFileDates = getFirstAndLastDayOnApp(
      payload.anonymizedTinderJson.Usage.app_opens,
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
              disabled={
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

          {/* User-facing notification - scenario-based */}
          {uploadContext?.scenario === "same_tinderId" && (
            <div className="mt-6 rounded-lg border-2 border-green-300 bg-green-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-green-900">
                📊 Adding to Existing Profile
              </h3>
              <p className="text-xs text-green-700">
                Your data will be merged with your existing profile. New days
                and matches will be added. Nothing will be lost.
              </p>
              {uploadContext.userProfile && (
                <p className="mt-1 text-xs text-green-600">
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
            </div>
          )}

          {uploadContext?.scenario === "different_tinderId" &&
            !isBackwardMerge && (
              <div className="mt-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-amber-900">
                  🔄 Merging Accounts
                </h3>
                <p className="text-xs text-amber-700">
                  You have an existing profile with a different Tinder ID. This
                  upload will merge your old account data into your new account.
                </p>
                {uploadContext.userProfile && (
                  <p className="mt-1 text-xs text-amber-600">
                    Old: {uploadContext.userProfile.tinderId.slice(0, 8)}... →
                    New: {tinderId?.slice(0, 8)}...
                  </p>
                )}
              </div>
            )}

          {uploadContext?.scenario === "different_tinderId" &&
            isBackwardMerge && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-red-900">
                  ⚠️ Wrong Order - Older Account Detected
                </h3>
                <p className="text-xs text-red-700">
                  This file is from an older Tinder account than your current
                  profile. Account merges must go from older → newer to avoid
                  data issues.
                </p>
                <p className="mt-2 text-xs text-red-600">
                  <strong>To fix:</strong> Delete your current profile first,
                  then upload this older file, then upload your newer account.
                </p>
                {uploadContext.userProfile && (
                  <p className="mt-2 text-xs text-red-500">
                    Your profile ends:{" "}
                    {new Date(
                      uploadContext.userProfile.lastDayOnApp,
                    ).toLocaleDateString()}
                    <br />
                    This file ends:{" "}
                    {getFirstAndLastDayOnApp(
                      payload.anonymizedTinderJson.Usage.app_opens,
                    ).lastDayOnApp.toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

          {uploadContext?.scenario === "different_tinderId" &&
            uploadContext?.identityMismatch && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-red-900">
                  ⚠️ Identity Mismatch Detected
                </h3>
                <p className="text-xs text-red-700">
                  These profiles appear to be from different people (birthdate
                  mismatch). This usually happens when testing with different
                  users&apos; data.
                </p>
                <p className="mt-2 text-xs text-red-600">
                  <strong>To fix:</strong> Delete your current profile first
                  before uploading test data.
                </p>
              </div>
            )}

          {uploadContext?.scenario === "owned_by_other" && (
            <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-red-900">
                ⚠️ Profile Already Exists
              </h3>
              <p className="text-xs text-red-700">
                This Tinder ID is already associated with another account.
              </p>
            </div>
          )}

          {/* 
          This is the default use case so we don't need to show anything
          {uploadContext?.scenario === "new_profile" && !existingProfile && (
            <div className="mt-6 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-blue-900">
                ✨ Creating New Profile
              </h3>
              <p className="text-xs text-blue-700">
                This will be your first Tinder profile on SwipeStats.
              </p>
            </div>
          )} */}

          {uploadContext?.scenario === "needs_signin" && (
            <div className="mt-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-yellow-900">
                🔐 Sign In Required
              </h3>
              <p className="text-xs text-yellow-700">
                This profile is linked to an existing account. Please sign in to
                update it, or contact support if you believe this is an error.
              </p>
              <Link
                href="/signin"
                className="mt-3 inline-block rounded bg-yellow-600 px-4 py-2 text-xs font-medium text-white hover:bg-yellow-700"
              >
                Sign In
              </Link>
            </div>
          )}

          {uploadContext?.scenario === "can_claim" && (
            <div className="mt-6 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-blue-900">
                👋 Welcome Back!
              </h3>
              <p className="text-xs text-blue-700">
                This looks like your profile from a previous session. Click
                upload to claim it and update your data.
              </p>
            </div>
          )}

          {/* Dev Admin Card - visible on localhost and preview deployments, hidden on production */}
          {showDevTools &&
            uploadContext &&
            uploadContext.scenario !== "new_user" &&
            uploadContext.scenario !== "new_profile" && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-red-900">
                  🛠️ Dev Admin Tools
                </h3>

                {/* Scenario Information */}
                <div className="mb-3 text-xs text-red-700">
                  <p className="font-semibold">
                    Scenario: {uploadContext.scenario}
                  </p>
                  {uploadContext.userProfile && (
                    <p className="mt-1">
                      Your profile:{" "}
                      {uploadContext.userProfile.tinderId.slice(0, 12)}...
                    </p>
                  )}
                  {uploadContext.targetProfile && (
                    <p className="mt-1">
                      Target profile:{" "}
                      {uploadContext.targetProfile.tinderId.slice(0, 12)}...
                    </p>
                  )}
                  {uploadContext.identityMismatch && (
                    <p className="mt-1 font-semibold text-red-800">
                      ⚠️ Identity Mismatch Detected
                    </p>
                  )}
                </div>

                {/* Quick Links */}
                {uploadContext.userProfile && (
                  <div className="mb-3 flex flex-col gap-2">
                    <Link
                      href={`/insights/tinder/${uploadContext.userProfile.tinderId}`}
                      className="rounded bg-blue-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700"
                    >
                      View Your Profile Insights
                    </Link>
                    <Link
                      href={`/insights/tinder/${uploadContext.userProfile.tinderId}/classic`}
                      className="rounded bg-purple-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-purple-700"
                    >
                      View Classic Insights
                    </Link>
                  </div>
                )}

                {/* Delete Button - Your Profile */}
                {uploadContext.userProfile && (
                  <button
                    onClick={() => {
                      const profileId = uploadContext.userProfile?.tinderId;
                      if (!profileId) return;

                      if (
                        confirm(
                          `Delete profile ${profileId}? This will cascade delete all related data (matches, messages, usage, etc.).`,
                        )
                      ) {
                        deleteProfileMutation.mutate({
                          tinderId: profileId,
                        });
                      }
                    }}
                    disabled={deleteProfileMutation.isPending}
                    className="w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteProfileMutation.isPending
                      ? "Deleting..."
                      : "Delete Your Profile"}
                  </button>
                )}

              {/* Delete Button - Target Profile (for can_claim scenario) */}
              {uploadContext.targetProfile &&
                uploadContext.scenario === "can_claim" && (
                  <button
                    onClick={() => {
                      const profileId = uploadContext.targetProfile?.tinderId;
                      if (!profileId) return;

                      if (
                        confirm(
                          `Delete claimable profile ${profileId.slice(0, 12)}...? This will cascade delete all related data.`,
                        )
                      ) {
                        deleteProfileMutation.mutate({
                          tinderId: profileId,
                        });
                      }
                    }}
                    disabled={deleteProfileMutation.isPending}
                    className="w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteProfileMutation.isPending
                      ? "Deleting..."
                      : "Delete Claimable Profile"}
                  </button>
                )}

              {/* Delete Button - Target Profile (for owned_by_other scenario) */}
              {uploadContext.targetProfile &&
                uploadContext.scenario === "owned_by_other" && (
                  <button
                    onClick={() => {
                      const profileId = uploadContext.targetProfile?.tinderId;
                      if (!profileId) return;

                      if (
                        confirm(
                          `Delete target profile ${profileId.slice(0, 12)}...? This belongs to another user. This will cascade delete all related data.`,
                        )
                      ) {
                        deleteProfileMutation.mutate({
                          tinderId: profileId,
                        });
                      }
                    }}
                    disabled={deleteProfileMutation.isPending}
                    className="mt-2 w-full rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {deleteProfileMutation.isPending
                      ? "Deleting..."
                      : "Delete Target Profile (Other User)"}
                  </button>
                )}
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
