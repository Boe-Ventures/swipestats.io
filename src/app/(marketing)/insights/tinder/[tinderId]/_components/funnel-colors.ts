/**
 * Color constants for the SwipeStats dating journey funnel
 * Supports both neutral (black/white) and shareable (rose-tinted) variants
 */

export type FunnelVariant = "neutral" | "shareable";

export interface FunnelColors {
  // Background gradient
  bgGradientStart: string;
  bgGradientEnd: string;

  // Path colors (main flow and dropouts)
  pathMain: string;
  pathDropoutGradientStart: string;
  pathDropoutGradientEnd: string;
  pathMainOpacity: number;
  pathDropoutOpacity: number;

  // Bubble colors
  bubbleFill: string;
  bubbleShadowColor: string;

  // Text colors
  textTitle: string;
  textNumber: string; // Numbers inside bubbles
  textLabel: string; // Side and bottom labels
  textLabelOpacity: number;
  textDropout: string;
  textDropoutOpacity: number;
  textFooter: string;
  textFooterOpacity: number;
}

/**
 * Shareable variant - Rose-tinted colors for exports
 * Light mode colors - Subtle rose gradient with professional aesthetic
 */
export const lightModeColors: FunnelColors = {
  // Subtle peachy-rose gradient (desaturated from brand rose)
  bgGradientStart: "oklch(0.92 0.08 25)", // Very light peachy rose
  bgGradientEnd: "oklch(0.75 0.15 20)", // Medium rose

  // Rose-tinted paths - semi-transparent rose over white
  pathMain: "oklch(0.95 0.05 17.585 / 0.95)", // Almost white with slight rose tint
  pathDropoutGradientStart: "oklch(0.95 0.05 17.585 / 0.8)",
  pathDropoutGradientEnd: "oklch(0.95 0.05 17.585 / 0)",
  pathMainOpacity: 1,
  pathDropoutOpacity: 0.4,

  // White bubbles with subtle shadow
  bubbleFill: "#ffffff",
  bubbleShadowColor: "oklch(0.3 0.05 20 / 0.15)",

  // Text colors using SwipeStats rose
  textTitle: "#ffffff",
  textNumber: "oklch(0.586 0.253 17.585)", // SwipeStats rose-600
  textLabel: "#ffffff",
  textLabelOpacity: 0.85,
  textDropout: "#ffffff",
  textDropoutOpacity: 0.5,
  textFooter: "#ffffff",
  textFooterOpacity: 0.7,
};

/**
 * Shareable variant - Rose-tinted colors for exports
 * Dark mode colors - Deep rose tones for dark backgrounds
 */
export const darkModeColors: FunnelColors = {
  // Deep burgundy to rich rose gradient
  bgGradientStart: "oklch(0.25 0.12 17.585)", // Deep burgundy
  bgGradientEnd: "oklch(0.35 0.18 17.585)", // Rich rose

  // Rose-tinted paths for dark mode
  pathMain: "oklch(0.3 0.08 17.585 / 0.9)", // Dark rose tint
  pathDropoutGradientStart: "oklch(0.3 0.08 17.585 / 0.7)",
  pathDropoutGradientEnd: "oklch(0.3 0.08 17.585 / 0)",
  pathMainOpacity: 0.95,
  pathDropoutOpacity: 0.35,

  // Dark card-colored bubbles
  bubbleFill: "oklch(0.21 0.006 285.885)", // Dark card color from globals.css
  bubbleShadowColor: "oklch(0 0 0 / 0.3)",

  // Text colors for dark mode
  textTitle: "oklch(0.985 0 0)", // Light foreground
  textNumber: "oklch(0.712 0.194 13.428)", // SwipeStats rose-400 (brighter for dark mode)
  textLabel: "oklch(0.985 0 0)",
  textLabelOpacity: 0.85,
  textDropout: "oklch(0.985 0 0)",
  textDropoutOpacity: 0.45,
  textFooter: "oklch(0.985 0 0)",
  textFooterOpacity: 0.65,
};

/**
 * Neutral variant - Clean white background for embedded page view
 * Light mode colors
 */
export const neutralLightModeColors: FunnelColors = {
  // Clean white background
  bgGradientStart: "#ffffff",
  bgGradientEnd: "#ffffff",

  // Subtle gray paths
  pathMain: "oklch(0.9 0.002 286)", // Very light gray
  pathDropoutGradientStart: "oklch(0.85 0.003 286 / 0.5)",
  pathDropoutGradientEnd: "oklch(0.85 0.003 286 / 0)",
  pathMainOpacity: 1,
  pathDropoutOpacity: 0.4,

  // White bubbles matching card background
  bubbleFill: "#ffffff",
  bubbleShadowColor: "oklch(0.141 0.005 285.823 / 0.12)",

  // Text colors matching site foreground
  textTitle: "oklch(0.141 0.005 285.823)", // --foreground
  textNumber: "oklch(0.141 0.005 285.823)", // --foreground
  textLabel: "oklch(0.552 0.016 285.938)", // --muted-foreground
  textLabelOpacity: 0.9,
  textDropout: "oklch(0.552 0.016 285.938)", // --muted-foreground
  textDropoutOpacity: 0.6,
  textFooter: "oklch(0.552 0.016 285.938)", // --muted-foreground
  textFooterOpacity: 0.7,
};

/**
 * Neutral variant - Black and white matching site design system
 * Dark mode colors
 */
export const neutralDarkModeColors: FunnelColors = {
  // Dark gradient matching site dark background
  bgGradientStart: "oklch(0.141 0.005 285.823)", // --background
  bgGradientEnd: "oklch(0.21 0.006 285.885)", // --card

  // Light paths for dark mode
  pathMain: "oklch(0.985 0 0)", // --foreground
  pathDropoutGradientStart: "oklch(0.985 0 0 / 0.6)",
  pathDropoutGradientEnd: "oklch(0.985 0 0 / 0)",
  pathMainOpacity: 0.9,
  pathDropoutOpacity: 0.3,

  // Dark card-colored bubbles
  bubbleFill: "oklch(0.21 0.006 285.885)", // --card
  bubbleShadowColor: "oklch(0 0 0 / 0.3)",

  // Text colors for dark mode
  textTitle: "oklch(0.985 0 0)", // --foreground
  textNumber: "oklch(0.985 0 0)", // --foreground
  textLabel: "oklch(0.705 0.015 286.067)", // --muted-foreground
  textLabelOpacity: 0.9,
  textDropout: "oklch(0.705 0.015 286.067)", // --muted-foreground
  textDropoutOpacity: 0.5,
  textFooter: "oklch(0.705 0.015 286.067)", // --muted-foreground
  textFooterOpacity: 0.7,
};

/**
 * Get colors based on theme and variant
 */
export function getFunnelColors(
  theme: "light" | "dark",
  variant: FunnelVariant = "neutral",
): FunnelColors {
  if (variant === "shareable") {
    return theme === "dark" ? darkModeColors : lightModeColors;
  }
  // Neutral variant (default)
  return theme === "dark" ? neutralDarkModeColors : neutralLightModeColors;
}
