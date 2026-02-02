"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useTinderProfile } from "../TinderProfileProvider";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ProfilePhotoGrid } from "../../../../upload/_components/ProfilePhotoGrid";

function getGenderDisplay(gender: string) {
  switch (gender) {
    case "MALE":
      return { symbol: "♂", text: "Man" };
    case "FEMALE":
      return { symbol: "♀", text: "Woman" };
    default:
      return { symbol: "◦", text: "Person" };
  }
}

/**
 * Profile preview component displaying SwipeStats data from database
 */
export function SwipestatsProfilePreview() {
  const { tinderId, profile: myTinderProfile } = useTinderProfile();
  const trpc = useTRPC();

  const { data: media } = useQuery(
    trpc.profile.getMedia.queryOptions({
      tinderId,
    }),
  );

  const genderDisplay = getGenderDisplay(myTinderProfile.gender);
  const age = myTinderProfile.ageAtUpload;

  // Process photos from media table
  const photos =
    media?.map((m) => ({
      url: m.url,
      alt: m.prompt ?? m.caption ?? undefined,
    })) ?? [];
  const hasPhotos = photos.length > 0;

  // Parse interests from JSON field
  const interests = myTinderProfile.userInterests
    ? (myTinderProfile.userInterests as string[])
    : [];

  // Parse jobs from JSON field
  const jobs = myTinderProfile.jobsRaw
    ? (myTinderProfile.jobsRaw as Array<{
        title?: { name?: string };
        company?: { name?: string };
      }>)
    : [];

  // Parse schools from JSON field
  const schools = myTinderProfile.schoolsRaw
    ? (myTinderProfile.schoolsRaw as Array<{ name?: string }>)
    : [];

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900">
      {/* Header with Photos */}
      <div className="rounded-t-lg bg-linear-to-r from-rose-700 via-rose-500 to-rose-300 p-4">
        {hasPhotos ? (
          <ProfilePhotoGrid photos={photos} initialPhotoCount={3} />
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
            {myTinderProfile.city && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {myTinderProfile.city}
                {myTinderProfile.region && `, ${myTinderProfile.region}`}
              </p>
            )}
          </div>
          <div className="text-left text-xs text-gray-500 sm:text-right dark:text-gray-400">
            <div>
              Joined {format(myTinderProfile.createDate, "MMM d, yyyy")}
            </div>
          </div>
        </div>

        {/* Bio */}
        {myTinderProfile.bio && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Bio
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {myTinderProfile.bio}
            </p>
          </div>
        )}

        {/* Jobs/Work */}
        {jobs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Work
            </h3>
            <div className="mt-1 space-y-1">
              {jobs.map((job, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  {job.title?.name}
                  {job.company?.name && ` @ ${job.company.name}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schools/Education */}
        {schools.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Education
            </h3>
            <div className="mt-1 space-y-1">
              {schools.map((school, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  {school.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Interests
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {interests.slice(0, 6).map((interest, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {interests.length > 6 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{interests.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Connected Accounts */}
        {(myTinderProfile.instagramConnected ||
          myTinderProfile.spotifyConnected) && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Connected
            </h3>
            <div className="mt-2 flex gap-2">
              {myTinderProfile.instagramConnected && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                >
                  Instagram
                </Badge>
              )}
              {myTinderProfile.spotifyConnected && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  Spotify
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Profile Period Stats */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Profile Period
          </h3>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            <div>
              Active from{" "}
              <span className="text-gray-800 dark:text-gray-200">
                {format(myTinderProfile.firstDayOnApp, "MMM d, yyyy")}
              </span>{" "}
              to{" "}
              <span className="text-gray-800 dark:text-gray-200">
                {format(myTinderProfile.lastDayOnApp, "MMM d, yyyy")}
              </span>
            </div>
            <div className="mt-1">
              Total days:{" "}
              <span className="font-bold">
                {myTinderProfile.daysInProfilePeriod}
              </span>
            </div>
          </div>
        </div>

        {/* Profile ID */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your anonymous SwipeStats ID:
          </p>
          <p className="mt-1 font-mono text-xs break-all text-gray-700 dark:text-gray-300">
            {tinderId}
          </p>
        </div>
      </div>
    </div>
  );
}
