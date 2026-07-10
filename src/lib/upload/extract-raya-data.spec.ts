/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { extractRayaData } from "./extract-raya-data";

const files = {
  "my-raya-data/user.json": JSON.stringify({
    first_name: "Private",
    last_name: "Person",
    birth_date: "1990-01-01",
    gender: "male",
    email_address: "Private@Example.com",
    instagram_username: "private-person",
    profile_image: "https://example.com/one.jpg",
  }),
  "my-raya-data/matches.json": JSON.stringify([
    {
      match_type: "MATCHED",
      liked: true,
      created_at: "2026-01-02T10:00:00.000Z",
    },
    {
      match_type: "POSSIBLE",
      liked: true,
      created_at: "2026-01-02T11:00:00.000Z",
    },
  ]),
  "my-raya-data/messages.json": JSON.stringify([
    {
      sender: "direct-identifier",
      body: "private message",
      created_at: "2026-01-03T10:00:00.000Z",
    },
  ]),
  "my-raya-data/social_likes_dislikes.json": JSON.stringify([
    {
      user: "direct-identifier",
      type: "social",
      liked: true,
      swiped_at: "2026-01-02T09:00:00.000Z",
    },
    {
      user: "direct-identifier",
      type: "social",
      liked: false,
      swiped_at: "2026-01-03T09:00:00.000Z",
    },
  ]),
};

describe("extractRayaData", () => {
  test("aggregates Raya activity and strips direct identifiers", async () => {
    const result = await extractRayaData(files);
    const serialized = JSON.stringify(result.anonymizedRayaJson);

    expect(result.rayaId).toHaveLength(64);
    expect(result.anonymizedRayaJson.Summary).toMatchObject({
      likes: 1,
      passes: 1,
      matches: 1,
      messagesSent: 1,
    });
    expect(result.anonymizedRayaJson.Usage).toHaveLength(2);
    expect(serialized).not.toContain("Private");
    expect(serialized).not.toContain("private message");
    expect(serialized).not.toContain("direct-identifier");
    expect(serialized).not.toContain("private-person");
  });

  test("requires the canonical activity files", async () => {
    try {
      await extractRayaData({
        ...files,
        "my-raya-data/matches.json": "",
      });
      throw new Error("Expected extraction to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("matches.json");
    }
  });
});
