import { describe, expect, test } from "bun:test";

import {
  CATALOG_CATEGORIES,
  CATALOG_PLACES,
  catalogEntryBelongsToCategory,
  catalogEntryMatchesLocation,
  getCatalogCategoryKeysBySection,
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

describe("catalog category configuration", () => {
  test("separates place-bound services from digital products", () => {
    expect(getCatalogCategoryKeysBySection("local_services")).toEqual([
      "dating_coach",
      "dating_photographer",
      "matchmaker",
    ]);
    expect(getCatalogCategoryKeysBySection("digital_products")).toEqual([
      "dating_app",
      "profile_feedback",
      "ai_photo_generation",
      "messaging_assistant",
    ]);
  });

  test("uses distinct location behavior for services, apps, and tools", () => {
    expect(CATALOG_CATEGORIES.dating_coach.locationMode).toBe("service_area");
    expect(CATALOG_CATEGORIES.dating_app.locationMode).toBe("market_signal");
    expect(CATALOG_CATEGORIES.profile_feedback.locationMode).toBe("global");
    expect(CATALOG_CATEGORIES.ai_photo_generation.locationMode).toBe("global");
    expect(CATALOG_CATEGORIES.messaging_assistant.locationMode).toBe("global");
  });

  test("shares hierarchical location matching across catalog consumers", () => {
    expect(
      catalogEntryMatchesLocation(
        {
          entityTypes: ["organization"],
          displayStyle: "organization",
          editorialSummary: "Oslo provider",
          serviceAreaIds: ["oslo-no"],
        },
        "norway",
        "dating_coach",
      ),
    ).toBe(true);
    expect(
      catalogEntryMatchesLocation(
        {
          entityTypes: ["app"],
          displayStyle: "product",
          editorialSummary: "Global tool",
        },
        "norway",
        "profile_feedback",
      ),
    ).toBe(false);
  });

  test("includes a listing in its secondary JSONB categories", () => {
    expect(
      catalogEntryBelongsToCategory(
        "dating_coach",
        {
          entityTypes: ["person", "organization"],
          displayStyle: "person",
          editorialSummary: "Coach and matchmaker",
          categories: ["dating_coach", "matchmaker"],
        },
        "matchmaker",
      ),
    ).toBe(true);
  });
});
