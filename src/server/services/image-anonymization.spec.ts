import { describe, expect, test } from "bun:test";

import { imageDetectionTiles } from "./image-anonymization.service";

describe("image detection tiles", () => {
  test("skips tiling for small images", () => {
    expect(imageDetectionTiles(767, 1_000)).toEqual([]);
    expect(imageDetectionTiles(1_000, 767)).toEqual([]);
  });

  test("covers a large image with overlapping edge-aligned tiles", () => {
    const tiles = imageDetectionTiles(1_600, 2_000);

    expect(tiles).toHaveLength(16);
    expect(tiles[0]).toEqual({ left: 0, top: 0, width: 512, height: 640 });
    expect(tiles.at(-1)).toEqual({
      left: 1_088,
      top: 1_360,
      width: 512,
      height: 640,
    });

    const centerCovered = tiles.some(
      (tile) =>
        tile.left <= 800 &&
        tile.left + tile.width >= 800 &&
        tile.top <= 1_000 &&
        tile.top + tile.height >= 1_000,
    );
    expect(centerCovered).toBe(true);
  });
});
