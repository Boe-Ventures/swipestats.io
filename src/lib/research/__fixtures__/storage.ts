import { expect, mock } from "bun:test";
const env = {
  RESEARCH_BLOB_READ_WRITE_TOKEN: undefined as string | undefined,
  BLOB_READ_WRITE_TOKEN: "public-token",
};
let privateReads = 0;
let publicReads = 0;
await mock.module("@/env", () => ({ env }));
await mock.module("@vercel/blob", () => ({
  get: async (_url: string, options: { token: string }) => {
    expect(options.token).toBe("private-token");
    privateReads++;
    return { statusCode: 200 };
  },
}));
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_url: string, options: RequestInit) => {
  publicReads++;
  expect(options.redirect).toBe("error");
  return new Response("legacy-byte-content");
}) as typeof fetch;
try {
  const { researchUploadOptions, readResearchBlob } =
    await import("@/server/services/research-storage");
  expect(researchUploadOptions()).toEqual({
    access: "public",
    token: "public-token",
  });
  const old = await readResearchBlob(
    "https://store.public.blob.vercel-storage.com/datasets/old.jsonl.gz",
  );
  expect(await new Response(old!.stream).text()).toBe("legacy-byte-content");
  env.RESEARCH_BLOB_READ_WRITE_TOKEN = "private-token";
  expect(researchUploadOptions()).toEqual({
    access: "private",
    token: "private-token",
  });
  await readResearchBlob(
    "https://store.private.blob.vercel-storage.com/datasets/new.jsonl.gz",
  );
  for (const url of [
    "http://store.public.blob.vercel-storage.com/datasets/x",
    "https://example.com/datasets/x",
    "https://store.public.blob.vercel-storage.com/other/x",
  ]) {
    let denied = false;
    try {
      await readResearchBlob(url);
    } catch {
      denied = true;
    }
    expect(denied).toBe(true);
  }
  expect(publicReads).toBe(1);
  expect(privateReads).toBe(1);
  console.log("Storage checks passed");
} finally {
  globalThis.fetch = originalFetch;
}
