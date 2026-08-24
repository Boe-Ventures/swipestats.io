import { describe, expect, test } from "bun:test";

import { SWIPESTATS_ORGANIZATION_JSON_LD } from "./agent-metadata";

describe("SwipeStats organization metadata", () => {
  test("publishes canonical brand and legal identity", () => {
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.name).toBe("SwipeStats");
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.alternateName).toBe("SwipeStats.io");
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.url).toBe(
      "https://www.swipestats.io",
    );
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.sameAs).toContain(
      "https://x.com/swipestats_io",
    );
  });

  test("includes agent-readable contact and postal address schemas", () => {
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.contactPoint["@type"]).toBe(
      "ContactPoint",
    );
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.contactPoint.email).toContain("@");
    expect(SWIPESTATS_ORGANIZATION_JSON_LD.address).toEqual({
      "@type": "PostalAddress",
      addressCountry: "NO",
    });
  });
});
