/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { buildUploadFailureCodexPrompt } from "./slack-codex";

describe("buildUploadFailureCodexPrompt", () => {
  test("scopes Tinder investigations to a safe draft PR", () => {
    const prompt = buildUploadFailureCodexPrompt("Tinder");

    expect(prompt).toContain("Tinder upload failure");
    expect(prompt).toContain("Boe-Ventures/swipestats.io");
    expect(prompt).toContain("open a draft PR");
    expect(prompt).toContain("Do not modify production data or merge");
  });

  test("supports Hinge alerts", () => {
    expect(buildUploadFailureCodexPrompt("Hinge")).toContain(
      "Hinge upload failure",
    );
  });
});
