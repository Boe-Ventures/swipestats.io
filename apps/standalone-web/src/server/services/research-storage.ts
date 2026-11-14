function assertResearchBlobUrl(url: string) {
  const parsed = new URL(url);
  const host = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.exec(
    parsed.hostname,
  );
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !host ||
    !parsed.pathname.startsWith("/datasets/")
  ) {
    throw new Error("Unsupported research storage URL");
  }
}

export async function readResearchBlob(url: string) {
  assertResearchBlobUrl(url);
  // Call only after entitlement checks. Keep the storage URL server-side.
  const response = await fetch(url, { redirect: "error", cache: "no-store" });
  if (!response.ok || !response.body)
    throw new Error("Research file unavailable");
  const length = response.headers.get("content-length");
  return {
    statusCode: 200 as const,
    stream: response.body,
    blob: { size: length === null ? undefined : Number(length) },
  };
}
