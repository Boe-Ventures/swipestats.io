import { describe, expect, test } from "bun:test";

import { expandCatalogLocation, getCatalogLocationBreadcrumb } from "./catalog";

describe("catalog location hierarchy", () => {
  test("an Oslo search includes city, country, and regional service areas", () => {
    const keys = expandCatalogLocation("oslo");

    expect(keys).toContain("oslo");
    expect(keys).toContain("norway");
    expect(keys).toContain("scandinavia");
    expect(keys).toContain("europe");
    expect(keys).not.toContain("berlin");
  });

  test("a country search includes its launch cities and broader coverage", () => {
    const keys = expandCatalogLocation("united-states");

    expect(keys).toContain("new-york");
    expect(keys).toContain("los-angeles");
    expect(keys).toContain("san-francisco");
    expect(keys).toContain("miami");
    expect(keys).toContain("california");
    expect(keys).toContain("north-america");
    expect(keys).not.toContain("oslo");
  });

  test("a state search includes its cities and country-wide providers", () => {
    const keys = expandCatalogLocation("california");

    expect(keys).toContain("california");
    expect(keys).toContain("los-angeles");
    expect(keys).toContain("san-francisco");
    expect(keys).toContain("united-states");
    expect(keys).toContain("north-america");
    expect(keys).not.toContain("new-york");
  });

  test("city breadcrumbs expose state and country without cluttering filters", () => {
    expect(getCatalogLocationBreadcrumb("new-york")).toEqual([
      "united-states",
      "new-york-state",
      "new-york",
    ]);
    expect(getCatalogLocationBreadcrumb("oslo")).toEqual(["norway", "oslo"]);
  });
});
