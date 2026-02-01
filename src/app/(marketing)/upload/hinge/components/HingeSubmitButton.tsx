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

interface HingeSubmitButtonProps {
  payload: SwipestatsHingeProfilePayload;
  isUpdate: boolean;
  disabled?: boolean;
  consent: HingeConsentState;
}

export function HingeSubmitButton({
  payload,
  isUpdate,
  disabled,
  consent,
}: HingeSubmitButtonProps) {
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
  const createMutation = useMutation(
    trpc.hingeProfile.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`/insights/hinge/${data.hingeId}`);
      },
      onError: (error) => {
        console.error("Error creating Hinge profile:", error);
        alert("Failed to upload profile. Please try again.");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.hingeProfile.update.mutationOptions({
      onSuccess: (data) => {
        router.push(`/insights/hinge/${data.hingeId}`);
      },
      onError: (error) => {
        console.error("Error updating Hinge profile:", error);
        alert("Failed to update profile. Please try again.");
      },
    }),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

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

    // Proceed with mutation (session cookie is set, server will authenticate)
    if (isUpdate && session) {
      updateMutation.mutate({
        hingeId: filteredPayload.hingeId,
        anonymizedHingeJson: filteredPayload.anonymizedHingeJson,
        timezone: browserTimezone,
        country: browserCountry,
      });
    } else {
      createMutation.mutate({
        hingeId: filteredPayload.hingeId,
        anonymizedHingeJson: filteredPayload.anonymizedHingeJson,
        timezone: browserTimezone,
        country: browserCountry,
      });
    }
  };

  const termsAccepted = consent.terms;
  const canSubmit = !disabled && termsAccepted;
  const isLoading =
    isCreatingSession || createMutation.isPending || updateMutation.isPending;

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
