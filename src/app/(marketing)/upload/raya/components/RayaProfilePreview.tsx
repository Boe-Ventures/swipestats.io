import { useEffect, useState } from "react";
import { differenceInYears, format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import type { SwipestatsRayaProfilePayload } from "@/lib/interfaces/RayaDataJSON";
import { ProfilePhotoGrid } from "../../_components/ProfilePhotoGrid";

interface RayaProfilePreviewProps {
  payload: SwipestatsRayaProfilePayload;
  photosWillBeSaved: boolean;
  workWillBeSaved: boolean;
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

function getStatusLabel(status?: string) {
  if (!status) return null;
  if (status.toLowerCase() === "accepted") return "Raya member";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function RayaProfilePreview({
  payload,
  photosWillBeSaved,
  workWillBeSaved,
  onBrokenImagesDetected,
}: RayaProfilePreviewProps) {
  const user = payload.anonymizedRayaJson.User;
  const summary = payload.anonymizedRayaJson.Summary;
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(
    new Set(),
  );

  const gender = getGenderDisplay(user.gender);
  const age = differenceInYears(new Date(), new Date(user.birth_date));
  const photos = user.photos.map((url, index) => ({
    url,
    alt: `Raya profile photo ${index + 1}`,
  }));
  const status = getStatusLabel(user.status);
  const totalSwipes = summary.likes + summary.passes;
  const matchRate = summary.likes > 0 ? summary.matches / summary.likes : 0;
  const likeRate = totalSwipes > 0 ? summary.likes / totalSwipes : 0;

  const handleImageError = (url: string) => {
    setBrokenImageUrls((previous) => new Set(previous).add(url));
  };

  useEffect(() => {
    onBrokenImagesDetected?.([...brokenImageUrls]);
  }, [brokenImageUrls, onBrokenImagesDetected]);

  return (
    <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="bg-linear-to-r from-black via-gray-900 to-gray-700 p-4">
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
        <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-white/70 uppercase">
          {photosWillBeSaved
            ? "Photos included in your private profile"
            : "Local preview · photos will not be saved"}
        </p>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

        {(user.occupation || user.company) && (
          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-800">Work</h3>
              {!workWillBeSaved && (
                <span className="text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                  Preview only
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {[user.occupation, user.company].filter(Boolean).join(" @ ")}
            </p>
          </section>
        )}

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-gray-800">Raya profile</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {status && <Badge variant="secondary">{status}</Badge>}
            <Badge variant="secondary">{photos.length} photos</Badge>
            {user.instagram_connected && (
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700"
              >
                Instagram connected
              </Badge>
            )}
            {user.website_connected && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Website connected
              </Badge>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-gray-800">
            Exported activity
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
            <PreviewMetric
              label="Swipes"
              value={totalSwipes.toLocaleString()}
              detail={`${(likeRate * 100).toFixed(1)}% likes`}
            />
            <PreviewMetric
              label="Matches"
              value={summary.matches.toLocaleString()}
              detail={`${(matchRate * 100).toFixed(1)}% of likes`}
            />
            <PreviewMetric
              label="Messages"
              value={summary.messagesSent.toLocaleString()}
              detail="sent"
            />
          </div>
        </section>

        <div className="mt-5 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Your anonymous SwipeStats ID:</p>
          <p className="mt-1 overflow-x-auto font-mono text-xs whitespace-nowrap text-gray-700">
            {payload.rayaId}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white px-3 py-3 text-center">
      <p className="text-lg font-semibold text-gray-950">{value}</p>
      <p className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-gray-400">{detail}</p>
    </div>
  );
}
