export const PROFILE_ROAST_LENS_KEYS = [
  "default",
  "buildwithareum",
  "datingbyblaine",
  "kelseywonderlin",
  "davidmeessen",
  "jamiedate",
] as const;

export type ProfileRoastLensKey = (typeof PROFILE_ROAST_LENS_KEYS)[number];

export const DEFAULT_PROFILE_ROAST_LENS: ProfileRoastLensKey = "default";

export interface ProfileRoastLens {
  label: string;
  shortLabel: string;
  creatorName: string;
  handle?: string;
  profileUrl?: string;
  imageSrc?: string;
  blurb: string;
  promise: string;
  bestFor: string;
  avatar: string;
  tags: string[];
  scope: string;
}

export const PROFILE_ROAST_LENSES: Record<
  ProfileRoastLensKey,
  ProfileRoastLens
> = {
  default: {
    label: "SwipeStats Roast",
    shortLabel: "Default",
    creatorName: "SwipeStats",
    profileUrl: "https://www.swipestats.io",
    blurb: "General profile roast.",
    promise: "A broad read across photos, prompts, bio, and profile balance.",
    bestFor: "Quick baseline before trying a creator lens.",
    avatar: "SS",
    tags: ["baseline", "profile mix", "quick wins"],
    scope: "",
  },
  buildwithareum: {
    label: "BuildWithAreum Bachelor Checklist",
    shortLabel: "Areum",
    creatorName: "BuildWithAreum",
    handle: "@buildwithareum",
    profileUrl: "https://www.instagram.com/buildwithareum/",
    imageSrc: "/creator-lenses/buildwithareum.jpg",
    blurb: "Audits the profile against the 10-photo bachelor rubric.",
    promise: "Finds the missing lifestyle signals in the photo lineup.",
    bestFor: "Bachelor profiles that need a stronger social media portfolio.",
    avatar: "A",
    tags: ["10-photo rubric", "lifestyle", "social proof"],
    scope: "creator:buildwithareum",
  },
  datingbyblaine: {
    label: "DatingByBlaine Find Your Person Lens",
    shortLabel: "Blaine",
    creatorName: "Blaine Anderson",
    handle: "@datingbyblaine",
    profileUrl: "https://www.instagram.com/datingbyblaine/",
    imageSrc: "/creator-lenses/datingbyblaine.jpg",
    blurb: "A matchmaker-style audit for serious dating momentum.",
    promise:
      "Checks whether the profile feels dateable, clear, and easy to trust.",
    bestFor: "People who want better matches, not just more attention.",
    avatar: "BA",
    tags: ["matchmaker", "intent", "trust"],
    scope: "creator:datingbyblaine",
  },
  kelseywonderlin: {
    label: "Kelsey Wonderlin Secure Love Lens",
    shortLabel: "Kelsey",
    creatorName: "Kelsey Wonderlin",
    handle: "@kelseywonderlin",
    profileUrl: "https://www.instagram.com/kelseywonderlin/",
    imageSrc: "/creator-lenses/kelseywonderlin.jpg",
    blurb: "A therapist-style audit for secure love without games.",
    promise:
      "Checks whether the profile feels emotionally safe, mature, and clear.",
    bestFor: "People who want secure love, not situationship ambiguity.",
    avatar: "KW",
    tags: ["secure love", "clarity", "attachment"],
    scope: "creator:kelseywonderlin",
  },
  davidmeessen: {
    label: "David Meessen Dream Woman Lens",
    shortLabel: "David",
    creatorName: "David Meessen",
    handle: "@david_meessen",
    profileUrl: "https://www.instagram.com/david_meessen/",
    imageSrc: "/creator-lenses/david_meessen.jpg",
    blurb: "A men’s dating expert lens for ambitious professionals.",
    promise:
      "Checks whether the profile projects leadership, lifestyle, and standards.",
    bestFor:
      "Busy professionals and business owners trying to attract high-fit partners.",
    avatar: "DM",
    tags: ["ambition", "masculine", "standards"],
    scope: "creator:davidmeessen",
  },
  jamiedate: {
    label: "Jamie Date Profile Maxing Lens",
    shortLabel: "Jamie",
    creatorName: "Jamie Date",
    handle: "@jamiedate",
    profileUrl: "https://www.instagram.com/jamiedate/",
    imageSrc: "/creator-lenses/jamiedate.jpg",
    blurb: "A men’s dating coach audit for profile maxing.",
    promise:
      "Finds the photos and signals that make her swipe right or lose respect.",
    bestFor:
      "Good men who need sharper photos, stronger posture, and less self-sabotage.",
    avatar: "JD",
    tags: ["profile maxing", "respect", "red flags"],
    scope: "creator:jamiedate",
  },
};

export function profileRoastLensScope(lens: ProfileRoastLensKey): string {
  return PROFILE_ROAST_LENSES[lens].scope;
}

export function profileRoastLensFromScope(
  scope: string | null | undefined,
): ProfileRoastLensKey {
  return (
    PROFILE_ROAST_LENS_KEYS.find(
      (lens) => PROFILE_ROAST_LENSES[lens].scope === (scope ?? ""),
    ) ?? DEFAULT_PROFILE_ROAST_LENS
  );
}
