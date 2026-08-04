import { describe, expect, it } from "bun:test";

import { mapHingeGender } from "./gender";

describe("mapHingeGender", () => {
  it("does not confuse woman/female with their male substrings", () => {
    expect(mapHingeGender("Woman")).toBe("FEMALE");
    expect(mapHingeGender("female")).toBe("FEMALE");
    expect(mapHingeGender("Man")).toBe("MALE");
    expect(mapHingeGender(" male ")).toBe("MALE");
  });
});
