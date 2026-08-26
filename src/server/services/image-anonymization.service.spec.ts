import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { anonymizeImageBuffer } from "./image-anonymization.service";

describe("anonymizeImageBuffer", () => {
  test("normalizes, strips metadata, and blurs detected regions", async () => {
    const source = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: "white",
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="80" height="80"><rect width="80" height="80" fill="black"/><rect x="40" width="40" height="80" fill="white"/></svg>`,
          ),
          left: 120,
          top: 80,
        },
      ])
      .withMetadata({ orientation: 1 })
      .jpeg()
      .toBuffer();

    const result = await anonymizeImageBuffer(source, {
      detectFaces: async () => [{ x: 120, y: 80, width: 80, height: 80 }],
    });
    const clearResult = await anonymizeImageBuffer(source, {
      detectFaces: async () => [],
    });
    const metadata = await sharp(result.buffer).metadata();

    expect(result.contentType).toBe("image/jpeg");
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    expect(result.faces).toEqual([{ x: 120, y: 80, width: 80, height: 80 }]);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(result.outputBytes).toBeGreaterThan(0);
    expect(result.buffer.equals(clearResult.buffer)).toBe(false);
  });

  test("rejects empty input", async () => {
    expect(anonymizeImageBuffer(new Uint8Array())).rejects.toThrow(
      "Image must contain",
    );
  });
});
