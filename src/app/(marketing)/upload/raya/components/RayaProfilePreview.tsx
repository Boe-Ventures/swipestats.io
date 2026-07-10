import { useEffect, useState } from "react";
import { differenceInYears, format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import type { SwipestatsRayaProfilePayload } from "@/lib/interfaces/RayaDataJSON";
import { ProfilePhotoGrid } from "../../_components/ProfilePhotoGrid";

interface RayaProfilePreviewProps {
  payload: SwipestatsRayaProfilePayload;
  sharePhotos: boolean;
  shareWorkInfo: boolean;
  onBrokenImagesDetected?: (brokenUrls: string[]) => void;
}

function getGenderDisplay(gender: string) {
  const normalized = gender.toLowerCase();
  if (normalized.includes("female") || normalized.includes("woman")) {
    return { symbol: "♀", text: "Woman" };
  }
  if (normalized.includes("male") || normalized.includes("man")) {
    return { symbol: "♂", text: "Man" };
  }
  return { symbol: "◦", text: "Person" };
}

export function RayaProfilePreview({
  payload,
  sharePhotos,
  shareWorkInfo,
  onBrokenImagesDetected,
}: RayaProfilePreviewProps) {
  const user = payload.anonymizedRayaJson.User;
  const summary = payload.anonymizedRayaJson.Summary;
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(
    new Set(),
  );

  const gender = getGenderDisplay(user.gender);
  const age = differenceInYears(new Date(), new Date(user.birth_date));
  const photos = sharePhotos
    ? user.photos.map((url, index) => ({
        url,
        alt: `Raya profile photo ${index + 1}`,
      }))
    : [];

  const handleImageError = (url: string) => {
    setBrokenImageUrls((previous) => new Set(previous).add(url));
  };

  useEffect(() => {
    onBrokenImagesDetected?.([...brokenImageUrls]);
  }, [brokenImageUrls, onBrokenImagesDetected]);

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-lg">
      <div className="rounded-t-lg bg-linear-to-r from-gray-950 via-gray-800 to-gray-600 p-4">
        {photos.length > 0 ? (
          <ProfilePhotoGrid
            photos={photos}
            initialPhotoCount={3}
            onImageError={handleImageError}
          />
        ) : (
          <div className="flex justify-center py-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl font-semibold text-white backdrop-blur-sm">
              <span role="img" aria-label={`${gender.text} profile`}>
                {gender.symbol}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xl font-bold text-gray-950">
              {gender.text}, {age}
            </div>
            {user.residence_location && (
              <p className="mt-0.5 text-sm text-gray-600">
                {user.residence_location}
              </p>
            )}
          </div>
          <div className="text-left text-xs text-gray-500 sm:text-right">
            <div>
              Activity since{" "}
              {format(new Date(summary.firstActivityAt), "MMM d, yyyy")}
            </div>
            <div>
              Last activity{" "}
              {format(new Date(summary.lastActivityAt), "MMM d, yyyy")}
            </div>
          </div>
        </div>

        {shareWorkInfo && (user.occupation || user.company) && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Work</h3>
            <p className="mt-1 text-sm text-gray-600">
              {[user.occupation, user.company].filter(Boolean).join(" @ ")}
            </p>
          </section>
        )}

        {(user.instagram_connected || user.website_connected) && (
          <section className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Connected</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.instagram_connected && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700"
                >
                  Instagram
                </Badge>
              )}
              {user.website_connected && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  Website
                </Badge>
              )}
            </div>
          </section>
        )}

        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Your anonymous SwipeStats ID:</p>
          <p className="mt-1 overflow-x-auto font-mono text-xs whitespace-nowrap text-gray-700">
            {payload.rayaId}
          </p>
        </div>
      </div>
    </div>
  );
}
