"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadLayout } from "../_components/UploadLayout";
import { DevAdminPanel } from "../_components/DevAdminPanel";
import { HingeGuidedUpload } from "./components/HingeGuidedUpload";
import { HingeProfilePreview } from "./components/HingeProfilePreview";
import { HingeSubmitButton } from "./components/HingeSubmitButton";
import { HingeEnhancement } from "./components/HingeEnhancement";
import { HingeTermsCheckbox } from "./components/HingeTermsCheckbox";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { DEFAULT_HINGE_CONSENT } from "@/lib/interfaces/HingeConsent";
import { env } from "@/env";

interface HingeUploadPageProps {
  isUpdate: boolean;
  isDebug: boolean;
}

/**
 * Derive birthDate from age and signup time (same logic as hinge-transform.service.ts)
 * This is needed for identity mismatch detection
 */
function deriveBirthDateFromJson(age: number, signupTime: string): string {
  const signupDate = new Date(signupTime);
  const birthYear = signupDate.getFullYear() - age;
  // Use January 1st as a default since we don't have the exact date
  return new Date(birthYear, 0, 1).toISOString();
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
  const showDevTools = !env.NEXT_PUBLIC_IS_PRODUCTION;

  // Derive birthDate for identity mismatch detection
  const birthDate = useMemo(() => {
    if (!payload?.anonymizedHingeJson.User.profile.age) return undefined;
    if (!payload?.anonymizedHingeJson.User.account.signup_time) return undefined;
    return deriveBirthDateFromJson(
      payload.anonymizedHingeJson.User.profile.age,
      payload.anonymizedHingeJson.User.account.signup_time,
    );
  }, [payload]);

  // Fetch upload context to determine scenario (new/additive/merge)
  const { data: uploadContext } = useQuery({
    ...trpc.hingeProfile.getUploadContext.queryOptions({ hingeId, birthDate }),
    enabled: !!hingeId,
    retry: false,
    staleTime: 60000, // Cache for 1 minute to avoid repeated calls
  });

  const deleteProfileMutation = useMutation(
    trpc.admin.deleteHingeProfile.mutationOptions({
      onSuccess: () => {
        // Invalidate queries so they refetch with updated data
        void queryClient.invalidateQueries(
          trpc.hingeProfile.get.queryOptions({ hingeId: hingeId ?? "" }),
        );
        void queryClient.invalidateQueries(
          trpc.hingeProfile.getUploadContext.queryOptions({ hingeId, birthDate }),
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
  // For Hinge, we use createDate (signup time) to determine chronological order
  const isBackwardMerge = useMemo(() => {
    if (
      !payload ||
      uploadContext?.scenario !== "different_hingeId" ||
      !uploadContext?.userProfile?.createDate
    ) {
      return false;
    }
    const newSignupTime = new Date(
      payload.anonymizedHingeJson.User.account.signup_time,
    );
    const existingCreateDate = new Date(uploadContext.userProfile.createDate);
    return newSignupTime < existingCreateDate;
  }, [uploadContext, payload]);

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
              disabled={
                !!error ||
                isBackwardMerge ||
                (uploadContext?.identityMismatch ?? false)
              }
              consent={consent}
              uploadContext={uploadContext}
            />
          </div>

          {/* User-facing notification - scenario-based */}
          {uploadContext?.scenario === "same_hingeId" && (
            <div className="mt-6 rounded-lg border-2 border-green-300 bg-green-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-green-900">
                Adding to Existing Profile
              </h3>
              <p className="text-xs text-green-700">
                Your data will be merged with your existing profile. New matches
                and interactions will be added. Nothing will be lost.
              </p>
              {uploadContext.userProfile && (
                <p className="mt-1 text-xs text-green-600">
                  Existing profile created:{" "}
                  {new Date(
                    uploadContext.userProfile.createDate,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {uploadContext?.scenario === "different_hingeId" &&
            !isBackwardMerge &&
            !uploadContext?.identityMismatch && (
              <div className="mt-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-amber-900">
                  Merging Accounts
                </h3>
                <p className="text-xs text-amber-700">
                  You have an existing profile with a different Hinge ID. This
                  upload will merge your old account data into your new account.
                </p>
                {uploadContext.userProfile && (
                  <p className="mt-1 text-xs text-amber-600">
                    Old: {uploadContext.userProfile.hingeId.slice(0, 8)}... →
                    New: {hingeId?.slice(0, 8)}...
                  </p>
                )}
              </div>
            )}

          {uploadContext?.scenario === "different_hingeId" && isBackwardMerge && (
            <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-red-900">
                Wrong Order - Older Account Detected
              </h3>
              <p className="text-xs text-red-700">
                This file is from an older Hinge account than your current
                profile. Account merges must go from older to newer to avoid
                data issues.
              </p>
              <p className="mt-2 text-xs text-red-600">
                <strong>To fix:</strong> Delete your current profile first, then
                upload this older file, then upload your newer account.
              </p>
              {uploadContext.userProfile && (
                <p className="mt-2 text-xs text-red-500">
                  Your profile created:{" "}
                  {new Date(
                    uploadContext.userProfile.createDate,
                  ).toLocaleDateString()}
                  <br />
                  This file created:{" "}
                  {new Date(
                    payload.anonymizedHingeJson.User.account.signup_time,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {uploadContext?.scenario === "different_hingeId" &&
            uploadContext?.identityMismatch && (
              <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                <h3 className="mb-1 text-sm font-semibold text-red-900">
                  Identity Mismatch Detected
                </h3>
                <p className="text-xs text-red-700">
                  These profiles appear to be from different people (age/birthdate
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
                Profile Already Exists
              </h3>
              <p className="text-xs text-red-700">
                This Hinge ID is already associated with another account.
              </p>
            </div>
          )}

          {uploadContext?.scenario === "needs_signin" && (
            <div className="mt-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-yellow-900">
                Sign In Required
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
                Welcome Back!
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
              <DevAdminPanel
                provider="hinge"
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
