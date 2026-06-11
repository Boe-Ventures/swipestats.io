import type { EducationLevel } from "@/server/db/schema";

/**
 * Human-readable labels for the education enum, so views never surface raw
 * SCREAMING_SNAKE values. Shared by the stack + flow profile previews.
 */
export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  HIGH_SCHOOL: "High school",
  BACHELORS: "Bachelor's degree",
  IN_COLLEGE: "In college",
  IN_GRAD_SCHOOL: "In grad school",
  MASTERS: "Master's degree",
  TRADE_SCHOOL: "Trade school",
  PHD: "PhD",
};

/**
 * Format a byte count as a human-readable size, e.g. 1536 → "1.5 KB".
 * Shared so gallery/upload UIs don't each carry their own copy.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
