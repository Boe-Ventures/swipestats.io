export const BLOG_PRODUCT_KEYS = [
  "insights",
  "profile-compare",
  "profile-roast",
  "prompt-assistant",
  "directory",
] as const;

export type BlogProductKey = (typeof BLOG_PRODUCT_KEYS)[number];
