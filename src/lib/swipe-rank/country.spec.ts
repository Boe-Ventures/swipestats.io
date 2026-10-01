import { describe, expect, test } from "bun:test";

import {
  countryDisplayName,
  areCountriesEquivalent,
  canonicalCountryCode,
  countryComparisonValues,
} from "./country";

describe("SwipeRank country comparison", () => {
  test("equates ISO-2, ISO-3, English name, and native name forms", () => {
    expect(canonicalCountryCode("NO")).toBe("NO");
    expect(canonicalCountryCode("NOR")).toBe("NO");
    expect(canonicalCountryCode("Norway")).toBe("NO");
    expect(canonicalCountryCode("Norge")).toBe("NO");
    expect(areCountriesEquivalent("NO", "Norway")).toBeTrue();
  });

  test("supports common unambiguous aliases", () => {
    expect(areCountriesEquivalent("UK", "GB")).toBeTrue();
    expect(areCountriesEquivalent("U.S.A.", "United States")).toBeTrue();
    expect(areCountriesEquivalent("UAE", "United Arab Emirates")).toBeTrue();
  });

  test("does not collapse different or unknown labels", () => {
    expect(areCountriesEquivalent("Norway", "Sweden")).toBeFalse();
    expect(areCountriesEquivalent("Atlantis", "El Dorado")).toBeFalse();
    expect(areCountriesEquivalent("Atlantis", " atlantis ")).toBeTrue();
  });

  test("returns database comparison forms without mutating a source value", () => {
    const values = countryComparisonValues("Norway");

    expect(values.aliases).toContain("no");
    expect(values.aliases).toContain("nor");
    expect(values.aliases).toContain("norway");
    expect(values.keys).toContain("norway");
  });
});

test("displays full country names and preserves unknown labels", () => {
  expect(countryDisplayName("HU")).toBe("Hungary");
  expect(countryDisplayName("US")).toBe("United States");
  expect(countryDisplayName("UK")).toBe("United Kingdom");
  expect(countryDisplayName("unknown place")).toBe("unknown place");
});
