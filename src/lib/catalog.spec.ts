import { describe, expect, test } from "bun:test";

import {
  CATALOG_PLACES,
  getCatalogLocationBreadcrumb,
  getCatalogRelatedPlaceIds,
  type CatalogPlaceId,
} from "./catalog";

describe("catalog place configuration", () => {
  test("derives canonical place IDs from the configuration keys", () => {
    const osloId = "oslo-no" satisfies CatalogPlaceId;

    expect(CATALOG_PLACES[osloId].slug).toBe("oslo");
    expect(CATALOG_PLACES[osloId].countryCode).toBe("NO");
  });

  test("an Oslo search includes country and overlapping regions", () => {
    const ids = getCatalogRelatedPlaceIds("oslo");

    expect(ids).toContain("oslo-no");
    expect(ids).toContain("NO");
    expect(ids).toContain("region:scandinavia");
    expect(ids).toContain("region:europe");
    expect(ids).not.toContain("berlin-de");
  });

  test("a country search includes launch cities, states, and its region", () => {
    const ids = getCatalogRelatedPlaceIds("united-states");

    expect(ids).toContain("new-york-us");
    expect(ids).toContain("los-angeles-us");
    expect(ids).toContain("san-francisco-us");
    expect(ids).toContain("miami-us");
    expect(ids).toContain("US-CA");
    expect(ids).toContain("region:north-america");
    expect(ids).not.toContain("oslo-no");
  });

  test("a state search includes its cities and broader ancestors", () => {
    const ids = getCatalogRelatedPlaceIds("california");

    expect(ids).toContain("US-CA");
    expect(ids).toContain("los-angeles-us");
    expect(ids).toContain("san-francisco-us");
    expect(ids).toContain("US");
    expect(ids).toContain("region:north-america");
    expect(ids).not.toContain("new-york-us");
  });

  test("breadcrumbs follow the typed primary-parent chain", () => {
    expect(
      getCatalogLocationBreadcrumb("new-york").map((place) => place.id),
    ).toEqual(["US", "US-NY", "new-york-us"]);
    expect(
      getCatalogLocationBreadcrumb("oslo").map((place) => place.id),
    ).toEqual(["NO", "oslo-no"]);
  });
});
