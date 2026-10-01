export const PUBLIC_AGE_BANDS = {
  "18-24": { label: "18–24", min: 18, max: 24 },
  "25-34": { label: "25–34", min: 25, max: 34 },
  "35-44": { label: "35–44", min: 35, max: 44 },
  "45-54": { label: "45–54", min: 45, max: 54 },
  "55+": { label: "55+", min: 55, max: 100 },
} as const;

export type PublicAgeBand = keyof typeof PUBLIC_AGE_BANDS;
export type PublicLeaderboardFilters = {
  gender?: "MALE" | "FEMALE";
  ageBand?: PublicAgeBand;
};
