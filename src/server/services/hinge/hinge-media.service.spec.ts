import { describe, expect, it } from "bun:test";

import { transformHingeMediaToDb } from "./hinge-media.service";

describe("transformHingeMediaToDb", () => {
  it("preserves social-media provenance and one row per provider URL", () => {
    const rows = transformHingeMediaToDb(
      [
        {
          url: "https://example.com/photo-1",
          type: "photo",
          prompt: "First",
          from_social_media: true,
        },
        {
          url: "https://example.com/photo-1",
          type: "photo",
          prompt: "Duplicate",
          from_social_media: false,
        },
        {
          url: "https://example.com/photo-2",
          type: "video",
          from_social_media: false,
        },
      ],
      "hinge-id",
    );

    expect(rows).toHaveLength(2);
    expect(
      rows.map(({ url, type, prompt, fromSoMe }) => ({
        url,
        type,
        prompt,
        fromSoMe,
      })),
    ).toEqual([
      {
        url: "https://example.com/photo-1",
        type: "photo",
        prompt: "First",
        fromSoMe: true,
      },
      {
        url: "https://example.com/photo-2",
        type: "video",
        prompt: null,
        fromSoMe: false,
      },
    ]);
  });
});
