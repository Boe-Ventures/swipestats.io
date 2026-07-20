import { describe, expect, it } from "bun:test";

import { getTinderExportMessageAuthor } from "./tinder-message-semantics";

describe("Tinder message semantics", () => {
  it("does not interpret the match reference as direction", () => {
    expect([0, 1, 18_082].map(getTinderExportMessageAuthor)).toEqual([
      "USER",
      "USER",
      "USER",
    ]);
  });
});
