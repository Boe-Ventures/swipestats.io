/**
 * Utility functions for generating SVG paths for the TinderInsights-style funnel
 * Based on the original TinderInsights implementation
 */

/**
 * Generate a curved transition path between two stages
 * This path is drawn RELATIVE to the current stage position, going UPWARD to connect to previous stage
 *
 * The path creates a smooth hourglass shape by using bezier curves where the control points
 * are at the midpoint height and aligned with the edge X coordinates
 *
 * @param prevStageX - X position of previous stage center
 * @param prevStageHalfWidth - Half-width of the previous stage
 * @param currentStageX - X position of current stage center
 * @param currentStageHalfWidth - Half-width of current stage
 * @param height - Vertical distance between stages (typically 256)
 * @returns SVG path string
 */
export function createTransitionPath(
  prevStageX: number,
  prevStageHalfWidth: number,
  currentStageX: number,
  currentStageHalfWidth: number,
  height = 256,
): string {
  // Calculate positions in the current stage's coordinate system
  // The current stage is at (0, 0), and we need to draw UP to the previous stage
  const offsetX = prevStageX - currentStageX;

  // Top edge positions (previous stage, at -height)
  const topLeft = offsetX - prevStageHalfWidth;
  const topRight = offsetX + prevStageHalfWidth;

  // Bottom edge positions (current stage, at 0)
  const bottomLeft = -currentStageHalfWidth;
  const bottomRight = currentStageHalfWidth;

  // Control point Y is at the midpoint
  const controlY = -height / 2;

  // Build the path following the exact pattern from TinderInsights
  const pathParts = [
    `M${topLeft} -${height}`, // Start at top-left
    `H ${topRight}`, // Horizontal line across top
    `C${topRight} ${controlY} ${bottomRight} ${controlY} ${bottomRight} 0`, // Curve down right side
    `L ${bottomRight} 0`, // Line to bottom-right corner
    `H ${bottomLeft}`, // Horizontal line across bottom
    `C${bottomLeft} ${controlY} ${topLeft} ${controlY} ${topLeft} -${height}`, // Curve up left side
    `Z`, // Close path
  ];

  return pathParts.join(" ");
}

/**
 * Calculate the half-width for a stage based on its value
 * Used for determining path endpoints
 */
export function calculateStageWidth(
  value: number,
  maxValue: number,
  maxWidth: number,
): number {
  if (maxValue === 0) return 0;
  return (value / maxValue) * maxWidth;
}

/**
 * Calculate pill bubble dimensions based on funnel width
 * Bubbles are approximately 1.3x wider than the funnel at that stage
 */
export function calculateBubbleDimensions(
  funnelWidth: number,
  isTopBubble = false,
): {
  width: number;
  x: number;
} {
  // Top bubble is special - fixed large size to fit "You swiped X times"
  if (isTopBubble) {
    const width = 436; // Matching original exactly
    return { width, x: -width / 2 };
  }

  // Regular bubbles are 1.3x the funnel width at that stage, with minimum 80px
  const width = Math.max(80, funnelWidth * 1.3);
  const x = -width / 2;

  return { width, x };
}
