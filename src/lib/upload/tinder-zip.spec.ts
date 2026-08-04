import { describe, expect, it } from "bun:test";

import { findUniqueTinderDataJsonPath } from "./tinder-zip";

describe("Tinder ZIP selection", () => {
  it("selects an exact nested data.json basename", () => {
    expect(
      findUniqueTinderDataJsonPath([
        "metadata.json",
        "mydata.json",
        "export/Data.JSON",
      ]),
    ).toBe("export/Data.JSON");
  });

  it("rejects missing or ambiguous exports", () => {
    expect(() => findUniqueTinderDataJsonPath(["metadata.json"])).toThrow(
      "Could not find",
    );
    expect(() =>
      findUniqueTinderDataJsonPath(["data.json", "nested/data.json"]),
    ).toThrow("multiple data.json");
  });
});
