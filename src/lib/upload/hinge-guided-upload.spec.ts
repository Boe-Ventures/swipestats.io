import { describe, expect, it } from "bun:test";

import {
  buildHingeExtractionInput,
  claimHingeExportFileCandidate,
  EMPTY_HINGE_CHECKLIST_STATE,
  getHingeExportFileKey,
  hasRequiredHingeExportFiles,
  validateHingeExportFile,
} from "./hinge-guided-upload";

describe("Hinge guided upload file recognition", () => {
  it("recognizes exact export basenames inside nested ZIP paths", () => {
    expect(getHingeExportFileKey("hinge-export/user.json")).toBe("user");
    expect(getHingeExportFileKey("MATCHES.JSON")).toBe("matches");
    expect(getHingeExportFileKey("prompts_feedback.json")).toBeUndefined();
  });

  it("flags duplicate same-kind files inside one selection", () => {
    const claimed = new Set<"user" | "matches" | "prompts" | "media">();

    expect(claimHingeExportFileCandidate("first/user.json", claimed)).toEqual({
      key: "user",
      duplicate: false,
    });
    expect(claimHingeExportFileCandidate("second/user.json", claimed)).toEqual({
      key: "user",
      duplicate: true,
    });
    expect(
      claimHingeExportFileCandidate("second/matches.json", claimed),
    ).toEqual({ key: "matches", duplicate: false });
  });

  it("does not mark malformed or structurally wrong files as loaded", () => {
    expect(validateHingeExportFile("matches", "not json")).toMatchObject({
      ok: false,
      key: "matches",
    });
    expect(
      validateHingeExportFile("matches", JSON.stringify({ matches: [] })),
    ).toMatchObject({ ok: false, key: "matches" });
    expect(
      validateHingeExportFile(
        "user",
        JSON.stringify({ account: {}, profile: {} }),
      ),
    ).toEqual({ ok: true, key: "user" });
  });
});

describe("Hinge guided upload completion", () => {
  it("requires user.json and matches.json but not prompts.json", () => {
    expect(
      hasRequiredHingeExportFiles({
        ...EMPTY_HINGE_CHECKLIST_STATE,
        user: "loaded",
        matches: "loaded",
      }),
    ).toBe(true);

    expect(
      hasRequiredHingeExportFiles({
        ...EMPTY_HINGE_CHECKLIST_STATE,
        user: "loaded",
        prompts: "loaded",
      }),
    ).toBe(false);
  });

  it("preserves explicit prompts.json presence for empty prompt exports", () => {
    const withoutPrompts = buildHingeExtractionInput({
      user: "{}",
      matches: "[]",
    });
    const withEmptyPrompts = buildHingeExtractionInput({
      user: "{}",
      matches: "[]",
      prompts: "[]",
    });

    expect(withoutPrompts.filePresence).toEqual({ prompts: false });
    expect(withoutPrompts.jsonStrings).toEqual(["{}", "[]"]);
    expect(withEmptyPrompts.filePresence).toEqual({ prompts: true });
    expect(withEmptyPrompts.jsonStrings).toEqual(["{}", "[]", "[]"]);
  });
});
