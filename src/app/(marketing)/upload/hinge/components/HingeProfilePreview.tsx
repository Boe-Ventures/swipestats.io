import { useState, useEffect } from "react";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { format } from "date-fns";
import { ProfilePhotoGrid } from "../../_components/ProfilePhotoGrid";

interface HingeProfilePreviewProps {
  payload: SwipestatsHingeProfilePayload;
  consent?: HingeConsentState;
  onBrokenImagesDetected?: (brokenUrls: string[]) => void;
}

function getGenderDisplay(gender: string) {
  const genderLower = gender.toLowerCase();
  if (genderLower.includes("man") || genderLower.includes("male")) {
    return { symbol: "♂", text: "Man" };
  }
  if (genderLower.includes("woman") || genderLower.includes("female")) {
    return { symbol: "♀", text: "Woman" };
  }
  return { symbol: "◦", text: "Person" };
}

export function HingeProfilePreview({
  payload,
  consent,
  onBrokenImagesDetected,
}: HingeProfilePreviewProps) {
  const user = payload.anonymizedHingeJson.User;
  const profile = user.profile;
  const location = user.location;
  const prompts = payload.anonymizedHingeJson.Prompts ?? [];
  const media = payload.anonymizedHingeJson.Media ?? [];
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(
    new Set(),
  );

  const signupDate = user.account?.signup_time
    ? new Date(user.account.signup_time)
    : null;
  const age = profile.age;
  const genderDisplay = getGenderDisplay(profile.gender ?? "Unknown");

  // Get only the 3 most recent prompts (by user_updated timestamp)
  const activePrompts = prompts
    .sort(
      (a, b) =>
        new Date(b.user_updated).getTime() - new Date(a.user_updated).getTime(),
    )
    .slice(0, 3);

  // Calculate stats
  const totalPrompts = prompts.length;

  // Get photos for display (reversed to show most recent first)
  // Only show photos if consented (or if consent is undefined for backward compatibility)
  const shouldShowPhotos = consent?.sharePhotos !== false;
  const photos =
    shouldShowPhotos && media
      ? media
          .filter((m) => m.type === "photo")
          .reverse()
          .map((m) => ({ url: m.url, alt: m.prompt ?? undefined }))
      : [];
  const hasPhotos = photos.length > 0;

  // Handle broken image detection
  const handleImageError = (url: string) => {
    setBrokenImageUrls((prev) => new Set(prev).add(url));
  };

  // Notify parent when broken images change (after render)
  useEffect(() => {
    if (onBrokenImagesDetected && brokenImageUrls.size > 0) {
      onBrokenImagesDetected(Array.from(brokenImageUrls));
    }
  }, [brokenImageUrls, onBrokenImagesDetected]);

  return (
    <div className="relative max-w-xl overflow-hidden rounded-lg bg-white shadow-lg">
      {/* Header with Photos */}
      <div className="rounded-t-lg bg-gradient-to-r from-purple-700 via-purple-500 to-pink-400 p-4">
        {hasPhotos ? (
          <ProfilePhotoGrid photos={photos} onImageError={handleImageError} />
        ) : (
          <div className="flex justify-center py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <div
                className="text-2xl font-bold text-white"
                role="img"
                aria-label={`${genderDisplay.text} profile`}
              >
                {genderDisplay.symbol}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-bold">
              {genderDisplay.text}, {age}
            </div>
            {location?.country && (
              <p className="text-sm text-gray-600">{location.country}</p>
            )}
          </div>
          {signupDate && (
            <div className="text-right text-xs text-gray-500">
              <div>Joined {format(signupDate, "MMM d, yyyy")}</div>
            </div>
          )}
        </div>

        {/* Profile Details */}
        {(profile.job_title_displayed ||
          profile.workplaces_displayed ||
          profile.schools_displayed) && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Profile Details
            </h3>
            <div className="mt-2 space-y-2 text-sm">
              {consent?.shareWorkInfo !== false &&
                profile.job_title_displayed &&
                profile.job_title && (
                  <div>
                    <span className="font-medium text-gray-600">Job:</span>
                    <span className="ml-2 text-gray-800">
                      {profile.job_title}
                    </span>
                  </div>
                )}
              {consent?.shareWorkInfo !== false &&
                profile.workplaces_displayed &&
                profile.workplaces && (
                  <div>
                    <span className="font-medium text-gray-600">Company:</span>
                    <span className="ml-2 text-gray-800">
                      {typeof profile.workplaces === "string"
                        ? (JSON.parse(profile.workplaces) as string[]).join(
                            ", ",
                          )
                        : profile.workplaces}
                    </span>
                  </div>
                )}
              {profile.schools_displayed && profile.schools && (
                <div>
                  <span className="font-medium text-gray-600">School:</span>
                  <span className="ml-2 text-gray-800">
                    {typeof profile.schools === "string"
                      ? (JSON.parse(profile.schools) as string[]).join(", ")
                      : profile.schools}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompts Preview */}
        {activePrompts.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Prompt Answers
            </h3>
            <div className="mt-2 space-y-3">
              {activePrompts.map((prompt, index) => (
                <div key={index} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    {prompt.prompt}
                  </p>
                  {prompt.text ? (
                    <p className="mt-1 text-sm text-gray-800">{prompt.text}</p>
                  ) : prompt.options ? (
                    <div className="mt-1 text-sm text-gray-800">
                      {prompt.options.join(" • ")}
                    </div>
                  ) : null}
                </div>
              ))}
              {totalPrompts > 3 && (
                <p className="text-xs text-gray-500">
                  +{totalPrompts - 3} more in history
                </p>
              )}
            </div>
          </div>
        )}

        {/* Preferences */}
        {user.preferences && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Preferences</h3>
            <div className="mt-2 space-y-2 text-sm">
              {user.preferences.gender_preference && (
                <div>
                  <span className="font-medium text-gray-600">
                    Looking for:
                  </span>
                  <span className="ml-2 text-gray-800">
                    {user.preferences.gender_preference}
                  </span>
                </div>
              )}
              {user.preferences.age_min !== undefined &&
                user.preferences.age_max !== undefined && (
                  <div>
                    <span className="font-medium text-gray-600">Age:</span>
                    <span className="ml-2 text-gray-800">
                      {user.preferences.age_min}-{user.preferences.age_max}
                      {user.preferences.age_dealbreaker && (
                        <span className="ml-1 text-xs text-red-600">
                          (dealbreaker)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              {user.preferences.distance_miles_max !== undefined && (
                <div>
                  <span className="font-medium text-gray-600">Distance:</span>
                  <span className="ml-2 text-gray-800">
                    Up to {user.preferences.distance_miles_max} miles
                  </span>
                </div>
              )}
              {user.preferences.height_min !== undefined &&
                user.preferences.height_max !== undefined &&
                // Only show if not default range (roughly 3' to 7')
                (user.preferences.height_min > 92 ||
                  user.preferences.height_max < 214) && (
                  <div>
                    <span className="font-medium text-gray-600">Height:</span>
                    <span className="ml-2 text-gray-800">
                      {Math.round(user.preferences.height_min)}-
                      {Math.round(user.preferences.height_max)} cm
                      {user.preferences.height_dealbreaker && (
                        <span className="ml-1 text-xs text-red-600">
                          (dealbreaker)
                        </span>
                      )}
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Profile ID */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Your anonymous SwipeStats ID:</p>
          <p className="mt-1 font-mono text-xs break-all text-gray-700">
            {payload.hingeId}
          </p>
        </div>
      </div>
    </div>
  );
}
