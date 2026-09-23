import { expect, test } from "bun:test";
import {
  parseResearchReceipt,
  captureResearchReceipt,
  consumeResearchReceipt,
} from "./receipt-access";

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
