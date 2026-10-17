export const isHingeProfileId = (value: string) => /^[a-f0-9]{64}$/.test(value);
export function parseHingeComparisonInput(value: string): string | null {
  const trimmed = value.trim();
  if (isHingeProfileId(trimmed.toLowerCase())) return trimmed.toLowerCase();
  try {
    const url = new URL(trimmed);
    if (
      !["www.swipestats.io", "swipestats.io", "localhost"].includes(
        url.hostname,
      )
    )
      return null;
    const id = /^\/insights\/hinge\/([a-f0-9]{64})(?:\/compare)?\/?$/.exec(
      url.pathname,
    )?.[1];
    return id ?? null;
  } catch {
    return null;
  }
}
