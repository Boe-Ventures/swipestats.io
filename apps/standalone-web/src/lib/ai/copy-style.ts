const emDash = String.fromCodePoint(0x2014);

export const GENERATED_COPY_STYLE =
  "Do not use em dashes (Unicode U+2014). Use commas, periods, colons, or parentheses instead.";

/** Normalize generated JSON copy, preserving content references and keys. */
export function normalizeGeneratedCopy<T>(value: T): T {
  if (typeof value === "string") {
    return value.replaceAll(emDash, " - ").replace(/ +-[ ]+/g, " - ") as T;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => normalizeGeneratedCopy(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]: [string, unknown]) => [
        key,
        key === "contentId" ? item : normalizeGeneratedCopy(item),
      ]),
    ) as T;
  }
  return value;
}
