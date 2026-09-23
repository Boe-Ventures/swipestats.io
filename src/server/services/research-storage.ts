import { get } from "@vercel/blob";
import { env } from "@/env";

export function researchUploadOptions() {
  // Retain existing fulfillment until the dedicated private store is configured.
  // Once configured, failures must not fall back to the public store.
  return env.RESEARCH_BLOB_READ_WRITE_TOKEN
    ? { access: "private" as const, token: env.RESEARCH_BLOB_READ_WRITE_TOKEN }
    : { access: "public" as const, token: env.BLOB_READ_WRITE_TOKEN };
}

export function researchBlobAccess(url: string) {
  const parsed = new URL(url);
  const host = /^[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com$/.exec(
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
  return host[1] === "private" ? "private" : "public";
}

export async function readResearchBlob(url: string) {
  if (researchBlobAccess(url) === "private") {
    if (!env.RESEARCH_BLOB_READ_WRITE_TOKEN)
      throw new Error("Private research storage is not configured");
    return get(url, {
      access: "private",
      token: env.RESEARCH_BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });
  }
  // Compatibility for already-purchased public objects during the staged rollout.
  // Only call after entitlement checks; never expose this URL in a response.
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
