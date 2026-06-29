import type { ProfileRoastLensKey } from "@/lib/ai/profile-roast-lenses";

const BUILDWITHAREUM_PROMPT = `Creator lens: BuildWithAreum's "10 out of 10 photos to have on your social media, bachelor edition".

Use this checklist as the primary rubric:
1. A solo shot where he is dressed well and looks like he has somewhere to be.
2. A full-body photo that is aesthetically pleasing, but is not a gym selfie.
3. A photo showing emotion; a simple candid laughing photo is a strong pick.
4. A simple travel photo.
5. An outdoor/adventure photo, like hiking or being active outside.
6. A group activity photo with the boys, not just standing around.
7. A clean headshot that does not look like a passport photo.
8. A hobby or interest photo.
9. No dead-fish Tinder cliche energy.
10. A good night-out photo that looks accidental, not staged.

In overall.tagline, include a compact score like "Areum Checklist: 6/10".
In overall.verdict, name the strongest present signals and the biggest missing
signals from the checklist. In realTalk, prioritize the missing checklist shots
as concrete retake briefs. For per-photo verdicts, tie each photo back to the
checklist item it helps or fails to satisfy when possible.`;

export function profileRoastLensPrompt(
  lens: ProfileRoastLensKey,
): string | undefined {
  if (lens === "buildwithareum") return BUILDWITHAREUM_PROMPT;
  return undefined;
}
