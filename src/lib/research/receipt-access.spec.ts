import { expect, test } from "bun:test";
import {
  parseResearchReceipt,
  captureResearchReceipt,
  consumeResearchReceipt,
} from "./receipt-access";
import { fingerprintStream } from "./file-integrity";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

test("new and legacy receipts prefill access while removing credentials from the URL", () => {
  for (const input of [
    "?licenseKey=secret&campaign=receipt",
    "?campaign=receipt#licenseKey=secret",
  ]) {
    expect(
      parseResearchReceipt(`https://swipestats.io/research/download${input}`),
    ).toEqual({
      licenseKey: "secret",
      cleanUrl: "/research/download?campaign=receipt",
    });
  }
  expect(
    parseResearchReceipt("https://swipestats.io/research#licenseKey=secret"),
  ).toBeNull();
});
test("copy verification hashes exact compressed bytes without changing research content", async () => {
  const bytes = gzipSync(
    "arbitrary legacy data, IDs, messages and formatting\n",
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes.subarray(0, 10));
      c.enqueue(bytes.subarray(10));
      c.close();
    },
  });
  expect(await fingerprintStream(stream)).toEqual({
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  });
});

test("a captured receipt is consumed once", () => {
  const original = globalThis.window;
  const location = {
    href: "https://swipestats.test/research/download#licenseKey=once",
  };
  globalThis.window = {
    location,
    history: {
      state: null,
      replaceState: (_state: unknown, _title: string, path: string) => {
        location.href = new URL(path, location.href).href;
      },
    },
  } as unknown as Window & typeof globalThis;
  try {
    captureResearchReceipt();
    expect(consumeResearchReceipt()).toBe("once");
    expect(consumeResearchReceipt()).toBe("");
  } finally {
    globalThis.window = original;
  }
});
