/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { transformTinderJsonToProfile } from "./transform.service";
import { parseAnonymizedTinderData } from "./validation.service";

const minimalExport = {
  Campaigns: {},
  Experiences: {},
  Messages: [],
  Usage: {
    app_opens: { "2026-01-12": 1, "2026-02-20": 2 },
    swipes_likes: {},
    swipes_passes: {},
    matches: {},
    messages_sent: {},
    messages_received: {},
  },
  User: {
    active_time: "2026-07-02T22:00:00.000Z",
    birth_date: "2001-01-01T00:00:00.000Z",
    create_date: "2025-01-01T00:00:00.000Z",
    gender: "M",
    gender_filter: "F",
    interested_in: "F",
    instagram: false,
    spotify: false,
  },
};

describe("parseAnonymizedTinderData", () => {
  test("accepts missing discovery age preferences as unknown", () => {
    const parsed = parseAnonymizedTinderData(minimalExport);
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-test",
      userId: "user-test",
    });

    expect(parsed.Photos).toEqual([]);
    expect(profile.ageFilterMin).toBeNull();
    expect(profile.ageFilterMax).toBeNull();
  });

  test("still rejects missing core profile fields", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: { ...minimalExport.User, birth_date: undefined },
      }),
    ).toThrow("User.birth_date");
  });
});
