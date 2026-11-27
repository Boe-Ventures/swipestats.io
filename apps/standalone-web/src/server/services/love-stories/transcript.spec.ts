import assert from "node:assert/strict";
import { afterEach, expect, mock, test } from "bun:test";
import { readTranscriptFile } from "./transcript";

// Protect the new network boundary and verbatim import against SSRF, unbounded
// reads and lossy decoding. Existing database tests cannot catch these failures.
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const fileUrl =
  "https://fixture.private.blob.vercel-storage.com/diary.md?signature=fixture";

test("imports exact text without credentials, caching or redirects", async () => {
  const body = "\ufeff# Diary\r\n\r\nI felt uncertain 🙂  \n";
  const fetchMock = mock(
    async () =>
      new Response(new TextEncoder().encode(body), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  expect(await readTranscriptFile(fileUrl)).toBe(body);
  const options = (
    fetchMock.mock.calls as unknown as [URL, RequestInit][]
  )[0]![1];
  expect(options).toMatchObject({
    redirect: "error",
    cache: "no-store",
    credentials: "omit",
  });
  expect(options.headers).toBeUndefined();
});

test("rejects arbitrary hosts and disguised URLs before fetching", async () => {
  const fetchMock = mock(async () => new Response("unexpected"));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  for (const url of [
    "http://localhost/diary.txt",
    "https://127.0.0.1/diary.txt",
    "https://fixture.public.blob.vercel-storage.com.evil.example/diary.txt",
    "https://fixture.public.blob.vercel-storage.com:444/diary.txt",
    "https://user:pass@fixture.public.blob.vercel-storage.com/diary.txt",
    "https://fixture.public.blob.vercel-storage.com/diary.html",
  ])
    await assert.rejects(() => readTranscriptFile(url), {
      code: "BAD_REQUEST",
    });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("rejects inaccessible, binary, truncated and oversized sources without partial saves", async () => {
  const responses = [
    () => new Response("denied", { status: 403 }),
    () =>
      new Response("<html>login</html>", {
        headers: { "content-type": "text/html" },
      }),
    () => new Response("", { headers: { "content-length": "400001" } }),
    () => new Response(new Uint8Array(400001)),
    () => new Response("a".repeat(100001)),
    () => new Response(new Uint8Array([0xc3, 0x28])),
    () => new Response("a\0b"),
    () => new Response(""),
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("partial"));
            controller.error(new Error("failed download"));
          },
        }),
      ),
  ];
  for (const response of responses) {
    globalThis.fetch = mock(async () => response()) as unknown as typeof fetch;
    await assert.rejects(() => readTranscriptFile(fileUrl), {
      code: "BAD_REQUEST",
    });
  }
});
