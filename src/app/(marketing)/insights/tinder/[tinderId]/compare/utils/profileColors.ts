/**
 * Color system for profile comparison in classic charts
 */

export const PROFILE_COLORS = [
  "hsl(4, 90%, 58%)", // Red - main profile (warm coral-red for love/matches)
  "hsl(217, 91%, 60%)", // Blue - comparison 1
  "hsl(142, 71%, 45%)", // Green - comparison 2
  "hsl(280, 70%, 50%)", // Purple - comparison 3
  "hsl(45, 93%, 58%)", // Gold - comparison 4
  "hsl(168, 76%, 42%)", // Teal - comparison 5
] as const;

export function getProfileColor(index: number): string {
  return PROFILE_COLORS[index % PROFILE_COLORS.length]!;
}

export function getProfileLabel(
  tinderId: string,
  myTinderId: string,
  index: number,
): string {
  if (tinderId === myTinderId) {
    return "You";
  }
  return `Profile ${index}`;
}
