export const PROFILE_ROAST_LENS_KEYS = ["default", "buildwithareum"] as const;

export type ProfileRoastLensKey = (typeof PROFILE_ROAST_LENS_KEYS)[number];

export const DEFAULT_PROFILE_ROAST_LENS: ProfileRoastLensKey = "default";

export const PROFILE_ROAST_LENSES: Record<
  ProfileRoastLensKey,
  {
    label: string;
    shortLabel: string;
    blurb: string;
    scope: string;
  }
> = {
  default: {
    label: "SwipeStats Roast",
    shortLabel: "Default",
    blurb: "General profile roast.",
    scope: "",
  },
  buildwithareum: {
    label: "BuildWithAreum Bachelor Checklist",
    shortLabel: "Areum",
    blurb: "Audits the profile against the 10-photo bachelor rubric.",
    scope: "creator:buildwithareum",
  },
};

export function profileRoastLensScope(lens: ProfileRoastLensKey): string {
  return PROFILE_ROAST_LENSES[lens].scope;
}
