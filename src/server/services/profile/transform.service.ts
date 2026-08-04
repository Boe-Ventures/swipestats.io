import he from "he";

import type { AnonymizedTinderDataJSON } from "@/lib/interfaces/TinderDataJSON";
import {
  differenceInUtcCalendarYears,
  getTinderObservedUsageRange,
  normalizeTinderUsageDateKey,
} from "@/lib/profile.utils";
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

  // Include every observed usage map. Tinder can report a swipe, match, or
  // message on a date that is absent from app_opens.
  const { firstDayOnApp, lastDayOnApp } = getTinderObservedUsageRange(usage);

  // These bounds are provider calendar keys normalized to UTC midnight, so an
  // exact UTC-day difference avoids server-timezone and DST dependence.
  const daysInProfilePeriod =
    Math.floor(
      (lastDayOnApp.getTime() - firstDayOnApp.getTime()) / 86_400_000,
    ) + 1;

  // Calculate ages
  const birthDate = new Date(user.birth_date);
  const ageAtUpload = differenceInUtcCalendarYears(new Date(), birthDate);
  const ageAtLastUsage = differenceInUtcCalendarYears(lastDayOnApp, birthDate);

  // Extract job and school info
  const firstJob = user.jobs?.[0];
  const firstSchool = user.schools?.[0];
  const city =
    typeof user.city === "string"
      ? user.city || null
      : (user.city?.name ?? null);
  const region =
    typeof user.city === "string" ? null : (user.city?.region ?? null);
  const country =
    typeof user.country === "string"
      ? user.country || null
      : (user.country?.code ?? null);

  return {
    tinderId: options.tinderId,
    userId: options.userId,
    birthDate,
    ageAtUpload,
    ageAtLastUsage,
    createDate: new Date(user.create_date),
    createDateSource:
      user.create_date_inferred === true
        ? "INFERRED_FROM_USAGE"
        : user.create_date_inferred === false
          ? "PROVIDER"
          : null,
    activeTime: user.active_time ? new Date(user.active_time) : null,
    gender: mapTinderGender(user.gender),
    genderStr: user.gender,
    bio: user.bio ? he.decode(user.bio) : null, // Decode HTML entities
    bioOriginal: user.bio ?? null,
    city,
    // Provider-authored profile geography is closer to the dating context;
    // request IP geography is only a fallback and may reflect travel or a VPN.
    country: country ?? options.country ?? null,
    region,
    userInterests: user.user_interests ?? null,
    interests: null,
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
    college: null,
    jobsRaw: user.jobs ?? null,
    schoolsRaw: user.schools ?? null,
    educationLevel: user.education ?? null,
    ageFilterMin: user.age_filter_min ?? null,
    ageFilterMax: user.age_filter_max ?? null,
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
  // REVIEW(provider assumption): Tinder's matches and right swipes are
  // independent daily event buckets. Their ratio is observed match yield, not
  // a causal per-swipe conversion probability, and may legitimately exceed 1.
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

  // REVIEW(provider assumption): Tinder provides aggregate sent/received
  // counts without message pairing. This legacy column is sent / received
  // activity, not the probability that either person replied.
  const responseRate = params.messagesReceivedCount
    ? params.messagesSentCount / params.messagesReceivedCount
    : 0;

  const normalizedDateStampRaw = normalizeTinderUsageDateKey(dateStampRaw);
  const dateStamp = new Date(`${normalizedDateStampRaw}T00:00:00.000Z`);
  const userAgeThisDay = differenceInUtcCalendarYears(dateStamp, userBirthDate);

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
    dateStampRaw: normalizedDateStampRaw,

    matchRate: matchRate,
    likeRate: likeRate,
    messagesSentRate: messagesSentRate,

    engagementRate,
    responseRate,
    tinderProfileId: tinderProfileId,

    userAgeThisDay,
  };
}
