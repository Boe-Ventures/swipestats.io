/**
 * Meta Calculation Utilities
 *
 * Shared statistical and mathematical utilities for profile meta services
 */

/**
 * Get median value from array of numbers
 */
export function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Safe ratio calculation - returns 0 when dividing by 0
 */
export function getRatio(x: number, dividedBy: number): number {
  if (dividedBy === 0) return 0;
  return x / dividedBy;
}
