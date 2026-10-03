/** Human Data identity. Bifrost owns the creative brief; these are runtime assets. */
export const SWIPESTATS_BRAND = {
  rose: "#E64368",
  action: "#C82E54",
  ink: "#202126",
  paper: "#FAF8F5",
  lilac: "#DAD5EC",
  sage: "#AABBAA",
} as const;

/** Five separated bars: raised outer edges, two lobes, and a central point. */
export const SWIPESTATS_HEART_BARS = [
  { x: 8, y: 24, width: 16, height: 36, rx: 8 },
  { x: 30, y: 12, width: 16, height: 64, rx: 8 },
  { x: 52, y: 28, width: 16, height: 74, rx: 8 },
  { x: 74, y: 12, width: 16, height: 64, rx: 8 },
  { x: 96, y: 24, width: 16, height: 36, rx: 8 },
] as const;
