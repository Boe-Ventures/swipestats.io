import { describe, expect, test } from "bun:test";

import { buildCatalogPlaceClosure, CATALOG_PLACE_SEEDS } from "./catalog";

describe("catalog place hierarchy", () => {
  const closure = buildCatalogPlaceClosure();

  function related(placeId: string) {
    return new Set(
      closure.flatMap((row) => {
        if (row.ancestorId === placeId) return [row.descendantId];
        if (row.descendantId === placeId) return [row.ancestorId];
        return [];
      }),
    );
  }

  test("uses Homi-compatible canonical city IDs", () => {
    const cityIds = CATALOG_PLACE_SEEDS.filter(
      (place) => place.kind === "CITY",
    ).map((place) => place.id);

    expect(cityIds).toEqual([
      "new-york-us",
      "los-angeles-us",
      "san-francisco-us",
      "miami-us",
      "oslo-no",
      "berlin-de",
    ]);
  });

  test("an Oslo assignment aggregates to country and overlapping regions", () => {
    const placeIds = related("oslo-no");

    expect(placeIds).toContain("oslo-no");
    expect(placeIds).toContain("NO");
    expect(placeIds).toContain("region:scandinavia");
    expect(placeIds).toContain("region:europe");
    expect(placeIds).not.toContain("berlin-de");
  });

  test("California aggregates both launch cities and the United States", () => {
    const placeIds = related("US-CA");

    expect(placeIds).toContain("los-angeles-us");
    expect(placeIds).toContain("san-francisco-us");
    expect(placeIds).toContain("US");
    expect(placeIds).toContain("region:north-america");
    expect(placeIds).not.toContain("new-york-us");
  });

  test("closure includes one self-row per place", () => {
    const selfRows = closure.filter(
      (row) => row.ancestorId === row.descendantId && row.depth === 0,
    );

    expect(selfRows).toHaveLength(CATALOG_PLACE_SEEDS.length);
  });
});
