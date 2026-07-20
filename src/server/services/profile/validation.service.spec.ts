/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { transformTinderJsonToProfile } from "./transform.service";
import { createUsageRecords } from "./usage.service";
import {
  parseAnonymizedTinderData,
  tinderBirthDatesMatch,
  tinderCreateDatesMatch,
} from "./validation.service";

const minimalExport = {
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
    expect(profile.createDateSource).toBeNull();
  });

  test("still rejects missing core profile fields", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: { ...minimalExport.User, birth_date: undefined },
      }),
    ).toThrow("User.birth_date");
  });

  test("accepts allowlisted Tinder metadata variants", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      Messages: [
        {
          match_id: "Match 1",
          messages: [
            {
              to: 1,
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
      },
    });
    const profile = transformTinderJsonToProfile(parsed, {
      tinderId: "tinder-metadata-variants",
      userId: "user-test",
    });

    expect(profile.city).toBe("Oslo");
    expect(profile.country).toBe("Norway");
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
      country: "US",
    });

    expect(profile.city).toBe("Oslo");
    expect(profile.region).toBeNull();
    expect(profile.country).toBe("NO");
  });

  test("rejects fields outside the public blob allowlist", () => {
    const invalidPayloads = [
      { ...minimalExport, private_top_level: true },
      {
        ...minimalExport,
        User: { ...minimalExport.User, ip_address: "203.0.113.10" },
      },
      {
        ...minimalExport,
        User: {
          ...minimalExport.User,
          city: {
            name: "Oslo",
            coords: { lat: 59.91, lon: 10.75 },
          },
        },
      },
      {
        ...minimalExport,
        Usage: {
          ...minimalExport.Usage,
          advertising_id: { "2026-01-12": "private" },
        },
      },
      {
        ...minimalExport,
        Messages: [{ match_id: "match", partner_id: "private", messages: [] }],
      },
      {
        ...minimalExport,
        Messages: [
          {
            match_id: "match",
            messages: [
              {
                to: 1,
                from: "Private Person",
                sent_date: "2026-01-12T12:00:00.000Z",
              },
            ],
          },
        ],
      },
      {
        ...minimalExport,
        Photos: [
          {
            type: "photo",
            url: "https://example.com/photo.jpg",
            filename: "private-filename.jpg",
          },
        ],
      },
    ];

    for (const payload of invalidPayloads) {
      expect(() => parseAnonymizedTinderData(payload)).toThrow(
        "Tinder data validation failed",
      );
    }
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

    expect(profile.firstDayOnApp.toISOString().slice(0, 10)).toBe("2025-12-31");
    expect(profile.lastDayOnApp.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(profile.daysInProfilePeriod).toBe(61);
  });

  test("normalizes legacy timestamp-shaped usage keys before persistence", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      Usage: {
        ...minimalExport.Usage,
        app_opens: { "2026-01-12T00:00:00.000Z": 1 },
        swipes_likes: { "2026-01-12T00:00:00.000Z": 3 },
      },
    });
    const rows = createUsageRecords(
      parsed,
      "tinder-normalized-usage",
      new Date(parsed.User.birth_date),
    );

    expect(parsed.Usage.app_opens).toEqual({ "2026-01-12": 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.dateStampRaw).toBe("2026-01-12");
    expect(rows[0]?.dateStamp.toISOString()).toBe("2026-01-12T00:00:00.000Z");
    expect(rows[0]?.swipeLikes).toBe(3);
  });

  test("rejects invalid usage counts and calendar keys", () => {
    for (const appOpens of [
      { "2026-01-12": -1 },
      { "2026-01-12": 1.5 },
      { "2026-02-30": 1 },
    ]) {
      expect(() =>
        parseAnonymizedTinderData({
          ...minimalExport,
          Usage: { ...minimalExport.Usage, app_opens: appOpens },
        }),
      ).toThrow("Usage.app_opens");
    }
  });

  test("rejects a derived combined-swipe count that exceeds its integer column", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Usage: {
          ...minimalExport.Usage,
          swipes_likes: { "2026-01-12": 2_147_483_647 },
          swipes_passes: { "2026-01-12": 1 },
        },
      }),
    ).toThrow("likes plus passes exceed the database integer range");
  });

  test("rejects two raw usage keys that represent the same day", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Usage: {
          ...minimalExport.Usage,
          app_opens: {
            "2026-01-12": 1,
            "2026-01-12T00:00:00.000Z": 2,
          },
        },
      }),
    ).toThrow("multiple usage keys resolve to 2026-01-12");
  });

  test("rejects invalid user and message timestamps", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: { ...minimalExport.User, birth_date: "2001-02-30" },
      }),
    ).toThrow("User.birth_date");

    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Messages: [
          {
            match_id: "Match 1",
            messages: [
              {
                to: 1,
                from: "You",
                message: "hello",
                sent_date: "2026-02-30T12:00:00.000Z",
              },
            ],
          },
        ],
      }),
    ).toThrow("Messages.0.messages.0.sent_date");

    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Messages: [
          {
            match_id: "Match 1",
            messages: [
              {
                to: 1,
                sent_date: "Mon, 31 Feb 2026 18:22:45 GMT",
              },
            ],
          },
        ],
      }),
    ).toThrow("Messages.0.messages.0.sent_date");

    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: {
          ...minimalExport.User,
          active_time: "2099-01-01T00:00:00.000Z",
        },
      }),
    ).toThrow("User.active_time");
  });

  test("rejects clearly future usage buckets", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Usage: {
          ...minimalExport.Usage,
          app_opens: { "2099-01-01": 1 },
        },
      }),
    ).toThrow("usage date is unreasonably far in the future");
  });

  test("enforces integer discovery preferences and their ordering", () => {
    expect(
      parseAnonymizedTinderData({
        ...minimalExport,
        User: { ...minimalExport.User, age_filter_max: 1000 },
      }).User.age_filter_max,
    ).toBe(1000);

    for (const User of [
      { ...minimalExport.User, age_filter_min: 17 },
      { ...minimalExport.User, age_filter_max: 35.5 },
      { ...minimalExport.User, age_filter_max: 121 },
      {
        ...minimalExport.User,
        age_filter_min: 40,
        age_filter_max: 30,
      },
    ]) {
      expect(() =>
        parseAnonymizedTinderData({ ...minimalExport, User }),
      ).toThrow("Tinder data validation failed");
    }
  });

  test("enforces conservative profile chronology", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: {
          ...minimalExport.User,
          birth_date: "2020-01-01T00:00:00.000Z",
          create_date: "2019-01-01T00:00:00.000Z",
        },
      }),
    ).toThrow("User.create_date");

    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        User: {
          ...minimalExport.User,
          create_date: "2025-01-01T00:00:00.000Z",
          active_time: "2024-12-31T23:59:59.000Z",
        },
      }),
    ).toThrow("User.active_time");
  });

  test("accepts a nonnegative integer Tinder match reference", () => {
    const parsed = parseAnonymizedTinderData({
      ...minimalExport,
      Messages: [
        {
          match_id: "Match 1",
          messages: [
            {
              to: 12_345,
              sent_date: "2026-01-12T12:00:00.000Z",
            },
          ],
        },
      ],
    });
    expect(parsed.Messages[0]?.messages[0]?.to).toBe(12_345);

    for (const to of [-1, 0.5, 2_147_483_648, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        parseAnonymizedTinderData({
          ...minimalExport,
          Messages: [
            {
              match_id: "Match 1",
              messages: [
                {
                  to,
                  sent_date: "2026-01-12T12:00:00.000Z",
                },
              ],
            },
          ],
        }),
      ).toThrow("Messages.0.messages.0.to");
    }
  });

  test("rejects empty and duplicate provider match IDs", () => {
    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Messages: [{ match_id: "  ", messages: [] }],
      }),
    ).toThrow("Messages.0.match_id");

    expect(() =>
      parseAnonymizedTinderData({
        ...minimalExport,
        Messages: [
          { match_id: "same", messages: [] },
          { match_id: " same ", messages: [] },
        ],
      }),
    ).toThrow("duplicate match_id");
  });

  test("enforces photo and work consent on the server contract", () => {
    expect(() =>
      parseAnonymizedTinderData(
        { ...minimalExport, Photos: ["https://example.com/photo.jpg"] },
        { photos: false, work: true },
      ),
    ).toThrow("without photo consent");

    expect(() =>
      parseAnonymizedTinderData(
        {
          ...minimalExport,
          User: {
            ...minimalExport.User,
            jobs: [{ company: { displayed: true, name: "Private Employer" } }],
          },
        },
        { photos: true, work: false },
      ),
    ).toThrow("without work consent");
  });

  test("compares cross-account identity by exact birth calendar date", () => {
    expect(
      tinderBirthDatesMatch(
        new Date("2001-01-01T00:00:00.000Z"),
        "2001-01-01T12:00:00.000Z",
      ),
    ).toBe(true);
    expect(
      tinderBirthDatesMatch(
        new Date("2001-01-01T00:00:00.000Z"),
        "2001-01-02T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  test("matches equivalent account-create timestamp spellings by instant", () => {
    expect(
      tinderCreateDatesMatch(
        new Date("2025-01-01T00:00:00.000Z"),
        "2024-12-31T19:00:00-05:00",
      ),
    ).toBe(true);
    expect(
      tinderCreateDatesMatch(
        new Date("2025-01-01T00:00:00.000Z"),
        "2025-01-02T00:00:00.000Z",
      ),
    ).toBe(false);
  });
});
