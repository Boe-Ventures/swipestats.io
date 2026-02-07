import Link from "next/link";
import type { UseMutationResult } from "@tanstack/react-query";
import { DevDeleteButton } from "./DevDeleteButton";
import { env } from "@/env";

// Simplified types to avoid complex tRPC type gymnastics
interface UploadContext {
  userProfile?: { tinderId?: string; hingeId?: string } | null;
  targetProfile?: { tinderId?: string; hingeId?: string } | null;
  scenario: string;
  identityMismatch: boolean;
}

// Discriminated union for props
type DevAdminPanelProps =
  | {
      provider: "tinder";
      uploadContext: UploadContext;
      deleteProfileMutation: UseMutationResult<unknown, unknown, unknown, unknown>;
    }
  | {
      provider: "hinge";
      uploadContext: UploadContext;
      deleteProfileMutation: UseMutationResult<unknown, unknown, unknown, unknown>;
    };

export function DevAdminPanel(props: DevAdminPanelProps) {
  const { provider, uploadContext, deleteProfileMutation } = props;

  // TEMPORARY DEBUG LOGGING
  console.log("🐛 DevAdminPanel Debug:", {
    NEXT_PUBLIC_IS_PRODUCTION: env.NEXT_PUBLIC_IS_PRODUCTION,
    NEXT_PUBLIC_VERCEL_ENV: env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
    showDevTools: !env.NEXT_PUBLIC_IS_PRODUCTION,
    shouldBeHidden: env.NEXT_PUBLIC_IS_PRODUCTION,
  });

  // Extract provider-specific values using type narrowing
  const profileIdField = provider === "tinder" ? "tinderId" : "hingeId";
  const userProfileId = uploadContext.userProfile?.[profileIdField];
  const targetProfileId = uploadContext.targetProfile?.[profileIdField];

  // Helper to check if scenario matches (accounting for different field names)
  const isScenario = (scenario: string) => {
    if (provider === "tinder") {
      return uploadContext.scenario === scenario;
    }
    // For Hinge, replace tinderId with hingeId in scenario names
    const hingeScenario = scenario.replace("tinderId", "hingeId");
    return uploadContext.scenario === hingeScenario;
  };

  return (
    <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-red-900">
        🛠️ Dev Admin Tools
      </h3>

      {/* DEBUG INFO - TEMPORARY */}
      <div className="mb-3 rounded border-2 border-yellow-500 bg-yellow-100 p-3">
        <p className="mb-2 text-xs font-bold text-yellow-900">
          🐛 DEBUG ENV INFO (Remove after checking):
        </p>
        <div className="space-y-1 font-mono text-[10px] text-yellow-800">
          <p>NEXT_PUBLIC_IS_PRODUCTION: {String(env.NEXT_PUBLIC_IS_PRODUCTION)}</p>
          <p>NEXT_PUBLIC_VERCEL_ENV: {env.NEXT_PUBLIC_VERCEL_ENV ?? "undefined"}</p>
          <p>NEXT_PUBLIC_BASE_URL: {env.NEXT_PUBLIC_BASE_URL}</p>
          <p>showDevTools would be: {String(!env.NEXT_PUBLIC_IS_PRODUCTION)}</p>
          <p className="mt-2 text-yellow-900">
            If showDevTools is &quot;true&quot; above, this panel should be hidden!
          </p>
        </div>
      </div>

      {/* Scenario Information */}
      <div className="mb-3 text-xs text-red-700">
        <p className="font-semibold">Scenario: {uploadContext.scenario}</p>
        {userProfileId && (
          <p className="mt-1">Your profile: {userProfileId.slice(0, 12)}...</p>
        )}
        {targetProfileId && (
          <p className="mt-1">
            Target profile: {targetProfileId.slice(0, 12)}...
          </p>
        )}
        {uploadContext.identityMismatch && (
          <p className="mt-1 font-semibold text-red-800">
            ⚠️ Identity Mismatch Detected
          </p>
        )}
      </div>

      {/* Quick Links */}
      {userProfileId && (
        <div className="mb-3 flex flex-col gap-2">
          <Link
            href={`/insights/${provider}/${userProfileId}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-blue-700"
          >
            View Your Profile Insights
          </Link>
          {provider === "tinder" && (
            <Link
              href={`/insights/tinder/${userProfileId}/classic`}
              className="rounded bg-purple-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-purple-700"
            >
              View Classic Insights
            </Link>
          )}
        </div>
      )}

      {/* Delete Button - Your Profile */}
      {userProfileId && (
        <DevDeleteButton
          profileId={userProfileId}
          profileIdFieldName={profileIdField}
          buttonText="Delete Your Profile"
          confirmMessage={`Delete profile ${userProfileId}? This will cascade delete all related data (matches, messages, usage, etc.).`}
          onDelete={(id) => {
            // Type assertion needed for tRPC mutation compatibility
            deleteProfileMutation.mutate(id as never);
          }}
          isPending={deleteProfileMutation.isPending}
        />
      )}

      {/* Delete Button - Target Profile (for can_claim scenario) */}
      {targetProfileId && isScenario("can_claim") && (
        <DevDeleteButton
          profileId={targetProfileId}
          profileIdFieldName={profileIdField}
          buttonText="Delete Claimable Profile"
          confirmMessage={`Delete claimable profile ${targetProfileId.slice(0, 12)}...? This will cascade delete all related data.`}
          onDelete={(id) => {
            // Type assertion needed for tRPC mutation compatibility
            deleteProfileMutation.mutate(id as never);
          }}
          isPending={deleteProfileMutation.isPending}
          buttonClassName="mt-2 w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        />
      )}

      {/* Delete Button - Target Profile (for owned_by_other scenario) */}
      {targetProfileId && isScenario("owned_by_other") && (
        <DevDeleteButton
          profileId={targetProfileId}
          profileIdFieldName={profileIdField}
          buttonText="Delete Target Profile (Other User)"
          confirmMessage={`Delete target profile ${targetProfileId.slice(0, 12)}...? This belongs to another user. This will cascade delete all related data.`}
          onDelete={(id) => {
            // Type assertion needed for tRPC mutation compatibility
            deleteProfileMutation.mutate(id as never);
          }}
          isPending={deleteProfileMutation.isPending}
          buttonClassName="mt-2 w-full rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        />
      )}
    </div>
  );
}
