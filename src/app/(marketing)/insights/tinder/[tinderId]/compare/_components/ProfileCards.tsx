"use client";

import { XCircle, Loader2 } from "lucide-react";
import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import { getProfileColor, getProfileLabel } from "../utils/profileColors";
import { ComparisonDialog } from "./ComparisonDialog";
import {
  getGlobalMeta,
  type TinderProfileWithUsage,
} from "@/lib/types/profile";

export function ProfileCards() {
  const { profile, tinderId, usage, meta: _meta } = useTinderProfile();
  const {
    comparisonProfiles,
    removeComparisonId,
    pendingProfileIds,
    comparisonIds: _comparisonIds,
  } = useComparison();

  // Combine profile with usage for meta calculation
  const profileWithUsage = { ...profile, usage };
  const profiles = [profileWithUsage, ...comparisonProfiles];

  // Helper to get match rate from profile
  const getMatchRate = (profile: unknown): string | null => {
    try {
      // Check if profile has the required data structure
      if (!profile || typeof profile !== "object" || !("usage" in profile) || !("profileMeta" in profile)) {
        return null;
      }
      const profileMeta = getGlobalMeta(profile as TinderProfileWithUsage);
      if (!profileMeta) return null;
      return (profileMeta.matchRate * 100).toFixed(2);
    } catch {
      return null;
    }
  };

  if (profiles.length === 0 && pendingProfileIds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Loaded profiles */}
      {profiles.map((profile, index) => {
        const isMainProfile = profile.tinderId === tinderId;
        const color = getProfileColor(index);
        const label = getProfileLabel(profile.tinderId, tinderId, index);
        const matchRate = getMatchRate(profile);

        return (
          <div
            key={profile.tinderId}
            className="flex items-center gap-2 rounded-full border-2 px-4 py-2 transition-all"
            style={{ borderColor: color }}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div className="flex items-baseline gap-1.5">
              <span className="font-medium">{label}</span>
              {matchRate && (
                <span className="text-muted-foreground text-sm tabular-nums">
                  {matchRate}%
                </span>
              )}
            </div>
            {!isMainProfile && (
              <button
                onClick={() => removeComparisonId(profile.tinderId)}
                className="hover:text-destructive ml-1 transition-colors"
                aria-label={`Remove ${label}`}
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}

      {/* Pending profiles (in URL but not loaded yet) */}
      {pendingProfileIds.map((tinderId, idx) => {
        // Calculate index for color based on total profiles
        const index = profiles.length + idx;
        const color = getProfileColor(index);
        const label = getProfileLabel(tinderId, tinderId, index);

        return (
          <div
            key={tinderId}
            className="flex items-center gap-2 rounded-full border-2 border-dashed px-4 py-2 opacity-60 transition-all"
            style={{ borderColor: color }}
          >
            <Loader2 className="h-3 w-3 animate-spin" style={{ color }} />
            <span className="font-medium">{label}</span>
            <button
              onClick={() => removeComparisonId(tinderId)}
              className="hover:text-destructive ml-1 transition-colors"
              aria-label={`Remove ${label}`}
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <ComparisonDialog />
    </div>
  );
}
