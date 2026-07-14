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

  test("accepts Tinder's optional metadata variants", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      Messages: [
        {
          match_id: "Match 1",
          messages: [
            {
              to: 1,
              from: "You",
              message: "A song",
              sent_date: "Mon, 12 Jan 2026 18:22:45 GMT",
              type: "song",
            },
          ],
        },
      ],
      User: {
        ...minimalExport.User,
        city: "Oslo",
        country: "Norway",
        display_genders: null,
        display_sexual_orientations: "",
      },
    });
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-metadata-variants",
      userId: "user-test",
    });

    expect(profile.city).toBe("Oslo");
    expect(profile.country).toBe("Norway");
    expect(parsed.User.display_sexual_orientations).toBe("");
    expect(parsed.Messages[0]?.messages[0]?.type).toBe("song");
  });

  test("accepts city objects without a region", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      User: {
        ...minimalExport.User,
        city: { name: "Oslo" },
        country: { code: "NO" },
      },
    });
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-city-without-region",
      userId: "user-test",
    });

    expect(profile.city).toBe("Oslo");
    expect(profile.region).toBeNull();
    expect(profile.country).toBe("NO");
  });

  test("discards Tinder's unreliable interested-in display label", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      User: {
        ...minimalExport.User,
        gender: "F",
        gender_filter: "More",
        interested_in: "More",
        interested_in_genders: "Unknown, Unknown, and Unknown",
      },
    });
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-interested-in-display-label",
      userId: "user-test",
    });

    expect(parsed.User.interested_in_genders).toBeUndefined();
    expect(profile.genderStr).toBe("F");
    expect(profile.genderFilterStr).toBe("More");
    expect(profile.interestedInStr).toBe("More");
  });

  test("derives the profile range from every observed usage map", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      Usage: {
        ...minimalExport.Usage,
        swipes_likes: { "2025-12-31": 2 },
        matches: { "2026-03-01": 1 },
      },
    });
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-full-observed-range",
      userId: "user-test",
    });

    expect(profile.firstDayOnApp.toISOString().slice(0, 10)).toBe(
      "2025-12-31",
    );
    expect(profile.lastDayOnApp.toISOString().slice(0, 10)).toBe(
      "2026-03-01",
    );
  });
});
