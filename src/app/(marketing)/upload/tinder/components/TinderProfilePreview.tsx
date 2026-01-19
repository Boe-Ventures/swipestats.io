import { useState, useEffect } from "react";
import type {
  SwipestatsProfilePayload,
  TinderPhoto,
} from "@/lib/interfaces/TinderDataJSON";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { Badge } from "@/components/ui/badge";
import { differenceInYears, format } from "date-fns";
import he from "he";
import { ProfilePhotoGrid } from "../../_components/ProfilePhotoGrid";

interface TinderProfilePreviewProps {
  payload: SwipestatsProfilePayload;
  consent?: TinderConsentState;
  onBrokenImagesDetected?: (brokenUrls: string[]) => void;
}

function getGenderDisplay(gender: string) {
  switch (gender) {
    case "M":
      return { symbol: "♂", text: "Man" };
    case "F":
      return { symbol: "♀", text: "Woman" };
    default:
      return { symbol: "◦", text: "Person" };
  }
}

export function TinderProfilePreview({
  payload,
  consent,
  onBrokenImagesDetected,
}: TinderProfilePreviewProps) {
  const user = payload.anonymizedTinderJson.User;
  const tinderPhotos = payload.anonymizedTinderJson.Photos;
  const [brokenImageUrls, setBrokenImageUrls] = useState<Set<string>>(
    new Set(),
  );

  const createDate = new Date(user.create_date);
  const birthDate = new Date(user.birth_date);
  const age = differenceInYears(new Date(), birthDate);
  const genderDisplay = getGenderDisplay(user.gender);

  // Process photos - handle both old format (string[]) and new format (TinderPhoto[])
  // Only show photos if consented (or if consent is undefined for backward compatibility)
  const shouldShowPhotos = consent?.photos !== false;
  const photos =
    shouldShowPhotos && Array.isArray(tinderPhotos)
      ? tinderPhotos.map((photo) => {
          if (typeof photo === "string") {
            // Old format: just a URL string
            return { url: photo };
          } else {
            // New format: TinderPhoto object
            return {
              url: photo.url,
              alt: photo.prompt_text || undefined,
            };
          }
        })
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
    <div className="relative w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-lg">
      {/* Header with Photos */}
      <div className="rounded-t-lg bg-gradient-to-r from-rose-700 via-rose-500 to-rose-300 p-4">
        {hasPhotos ? (
          <ProfilePhotoGrid
            photos={photos}
            gradientColors="from-rose-700 via-rose-500 to-rose-300"
            initialPhotoCount={3}
            onImageError={handleImageError}
          />
        ) : (
          <div className="flex justify-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm sm:h-16 sm:w-16">
              <div
                className="text-xl font-bold text-white sm:text-2xl"
                role="img"
                aria-label={`${genderDisplay.text} profile`}
              >
                {genderDisplay.symbol}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="text-lg font-bold sm:text-xl">
              {genderDisplay.text}, {age}
            </div>
            {user.city && (
              <p className="mt-0.5 text-sm text-gray-600">
                {user.city.name}
                {user.city.region && `, ${user.city.region}`}
              </p>
            )}
          </div>
          <div className="text-left text-xs text-gray-500 sm:text-right">
            <div>Joined {format(createDate, "MMM d, yyyy")}</div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Bio</h3>
            <p className="mt-1 text-sm text-gray-600">{he.decode(user.bio)}</p>
          </div>
        )}

        {/* Jobs/Work */}
        {consent?.work !== false && user.jobs && user.jobs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Work</h3>
            <div className="mt-1 space-y-1">
              {user.jobs.map((job, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {job.title?.name}
                  {job.company?.name && ` @ ${job.company.name}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schools/Education - Always shown (schools are anonymous) */}
        {user.schools && user.schools.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Education</h3>
            <div className="mt-1 space-y-1">
              {user.schools.map((school, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {school.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {user.user_interests && user.user_interests.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Interests</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.user_interests.slice(0, 6).map((interest, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {user.user_interests.length > 6 && (
                <span className="text-xs text-gray-500">
                  +{user.user_interests.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Descriptors/Lifestyle */}
        {user.descriptors && user.descriptors.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Lifestyle</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.descriptors.map((descriptor, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {descriptor.choices?.join(", ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Connected Accounts */}
        {(user.instagram || user.spotify) && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700">Connected</h3>
            <div className="mt-2 flex gap-2">
              {user.instagram && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700"
                >
                  Instagram
                </Badge>
              )}
              {user.spotify && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  Spotify
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Looking for */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700">Preferences</h3>
          <div className="mt-1 text-xs text-gray-600">
            {user.interested_in && (
              <div>
                Interested in:{" "}
                <span className="text-gray-800">{user.interested_in}</span>
              </div>
            )}
            <div>
              Age range: {user.age_filter_min}-{user.age_filter_max}
            </div>
          </div>
        </div>

        {/* Profile ID */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Your anonymous SwipeStats ID:</p>
          <p className="mt-1 font-mono text-xs break-all text-gray-700">
            {payload.tinderId}
          </p>
        </div>
      </div>
    </div>
  );
}
