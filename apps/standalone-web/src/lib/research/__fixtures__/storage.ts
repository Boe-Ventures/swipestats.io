import { expect } from "bun:test";
let publicReads = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_url: string, options: RequestInit) => {
  publicReads++;
  expect(options.redirect).toBe("error");
  return new Response("legacy-byte-content");
}) as typeof fetch;
try {
  const { readResearchBlob } =
    await import("@/server/services/research-storage");
  const file = await readResearchBlob(
    "https://store.public.blob.vercel-storage.com/datasets/old.jsonl.gz",
  );
  expect(await new Response(file.stream).text()).toBe("legacy-byte-content");
  for (const url of [
    "http://store.public.blob.vercel-storage.com/datasets/x",
    "https://example.com/datasets/x",
    "https://store.public.blob.vercel-storage.com/other/x",
    "https://store.private.blob.vercel-storage.com/datasets/x",
  ]) {
    let rejected = false;
    try {
      await readResearchBlob(url);
    } catch (error) {
      rejected = true;
      expect((error as Error).message).toBe("Unsupported research storage URL");
    }
    expect(rejected).toBe(true);
  }
  expect(publicReads).toBe(1);
  console.log("Storage checks passed");
} finally {
  globalThis.fetch = originalFetch;
}
