import { differenceInDays, differenceInYears } from "date-fns";
import he from "he";

import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import { getFirstAndLastDayOnApp } from "@/lib/profile.utils";
import type {
  TinderProfileInsert,
  TinderUsageInsert,
} from "@/server/db/schema";
import { mapTinderGender } from "@/lib/utils/gender";

/**
 * Transforms AnonymizedTinderDataJSON into database profile format
 */
export function transformTinderJsonToProfile(
  json: AnonymizedTinderDataJSON,
  options: {
    tinderId: string;
    userId: string;
    timezone?: string;
    country?: string;
  },
): Omit<TinderProfileInsert, "createdAt" | "updatedAt"> {
  const user = json.User;
  const usage = json.Usage;

  // Calculate first and last day on app from usage data
  const { firstDayOnApp, lastDayOnApp } = getFirstAndLastDayOnApp(
    usage.app_opens,
  );

  // Calculate days in profile period
  const daysInProfilePeriod = differenceInDays(lastDayOnApp, firstDayOnApp) + 1;

  // Calculate ages
  const birthDate = new Date(user.birth_date);
  const ageAtUpload = differenceInYears(new Date(), birthDate);
  const ageAtLastUsage = differenceInYears(lastDayOnApp, birthDate);

  // Extract job and school info
  const firstJob = user.jobs?.[0];
  const firstSchool = user.schools?.[0];

  return {
    tinderId: options.tinderId,
    userId: options.userId,
    birthDate,
    ageAtUpload,
    ageAtLastUsage,
    createDate: new Date(user.create_date),
    activeTime: user.active_time ? new Date(user.active_time) : null,
    gender: mapTinderGender(user.gender),
    genderStr: user.gender,
    bio: user.bio ? he.decode(user.bio) : null, // Decode HTML entities
    bioOriginal: user.bio ?? null,
    city: user.city?.name ?? null,
    country: options.country ?? user.country?.code ?? null,
    region: user.city?.region ?? null,
    userInterests: user.user_interests ?? null,
    interests: user.interests ?? null,
    sexualOrientations: user.sexual_orientations ?? null,
    descriptors: user.descriptors ?? null,
    instagramConnected: user.instagram ?? false,
    spotifyConnected: user.spotify ?? false,
    jobTitle: firstJob?.title?.name ?? null,
    jobTitleDisplayed: firstJob?.title?.displayed ?? null,
    company: firstJob?.company?.name ?? null,
    companyDisplayed: firstJob?.company?.displayed ?? null,
    school: firstSchool?.name ?? null,
    schoolDisplayed: firstSchool?.displayed ?? null,
    college: user.college ?? null,
    jobsRaw: user.jobs ?? null,
    schoolsRaw: user.schools ?? null,
    educationLevel: user.education ?? null,
    ageFilterMin: user.age_filter_min,
    ageFilterMax: user.age_filter_max,
    interestedIn: mapTinderGender(user.interested_in),
    interestedInStr: user.interested_in,
    genderFilter: mapTinderGender(user.gender_filter),
    genderFilterStr: user.gender_filter,
    swipestatsVersion: "SWIPESTATS_4",
    firstDayOnApp,
    lastDayOnApp,
    daysInProfilePeriod,
  };
}

/**
 * Computes a single day's usage record
 */
export function computeUsageInput(
  params: {
    appOpensCount: number;
    matchesCount: number;
    swipeLikesCount: number;
    swipeSuperLikesCount: number;
    swipePassesCount: number;
    messagesSentCount: number;
    messagesReceivedCount: number;
  },
  dateStampRaw: string,
  tinderProfileId: string,
  userBirthDate: Date,
): TinderUsageInsert {
  const matchRate = params.swipeLikesCount
    ? params.matchesCount / params.swipeLikesCount
    : 0;
  const likeRate =
    params.swipeLikesCount + params.swipePassesCount
      ? params.swipeLikesCount /
        (params.swipeLikesCount + params.swipePassesCount)
      : 0;
  const messagesSentRate =
    params.messagesSentCount + params.messagesReceivedCount
      ? params.messagesSentCount /
        (params.messagesSentCount + params.messagesReceivedCount)
      : 0;

  const engagementRate = params.appOpensCount
    ? (params.swipeLikesCount +
        params.swipePassesCount +
        params.messagesSentCount) /
      params.appOpensCount
    : 0;

  const responseRate = params.messagesReceivedCount
    ? params.messagesSentCount / params.messagesReceivedCount
    : 0;

  const dateStamp = new Date(dateStampRaw);
  const userAgeThisDay = differenceInYears(dateStamp, userBirthDate);

  return {
    appOpens: params.appOpensCount,
    matches: params.matchesCount,

    swipeLikes: params.swipeLikesCount,
    swipeSuperLikes: params.swipeSuperLikesCount,
    swipePasses: params.swipePassesCount,
    swipesCombined: params.swipeLikesCount + params.swipePassesCount,

    messagesSent: params.messagesSentCount,
    messagesReceived: params.messagesReceivedCount,

    dateStamp,
    dateStampRaw,

    matchRate: matchRate,
    likeRate: likeRate,
    messagesSentRate: messagesSentRate,

    engagementRate,
    responseRate,
    tinderProfileId: tinderProfileId,

    userAgeThisDay,
  };
}
