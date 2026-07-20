import { describe, expect, it } from "bun:test";

import {
  parseAnonymizedHingeBlob,
  sanitizeAnonymizedHingeBlob,
} from "./hinge-runtime-schema";

const validBlob = {
  User: {
    preferences: {},
    identity: {},
    account: {
      signup_time: "2020-01-01T00:00:00.000Z",
      last_seen: "2026-01-01T00:00:00.000Z",
    },
    installs: [],
    profile: { age: 30 },
  },
  Matches: [],
  Prompts: [],
};

describe("parseAnonymizedHingeBlob", () => {
  it("accepts the anonymized upload contract", () => {
    const parsed = parseAnonymizedHingeBlob(validBlob);
    expect(parsed.User.account.signup_time).toBe(
      validBlob.User.account.signup_time,
    );
    expect(parsed.Matches).toEqual([]);
  });

  it("accepts Hinge's historical timezone-less microsecond grammar", () => {
    const timestamp = "2025-06-27 11:55:38.243522";
    const parsed = parseAnonymizedHingeBlob({
      ...validBlob,
      User: {
        ...validBlob.User,
        account: {
          signup_time: "2020-01-01 00:00:00",
          last_seen: "2026-01-01T00:00:00",
        },
      },
      Matches: [
        {
          like: [{ timestamp, like: [{ timestamp }] }],
        },
      ],
    });

    expect(parsed.Matches[0]?.like?.[0]?.timestamp).toBe(timestamp);
  });

  it("rejects malformed identity fields before persistence", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          account: { ...validBlob.User.account, signup_time: "not-a-date" },
        },
      }),
    ).toThrow();
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: { ...validBlob.User, profile: { age: 12 } },
      }),
    ).toThrow();
  });

  it("rejects unknown fields at every server boundary level", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          identity: { email: "person@example.com" },
        },
      }),
    ).toThrow();
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          account: {
            ...validBlob.User.account,
            device_model: "private device detail",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      parseAnonymizedHingeBlob({ ...validBlob, Subscriptions: [] }),
    ).toThrow();
  });

  it("requires meaningful recognized activity and validates it deeply", () => {
    expect(() =>
      parseAnonymizedHingeBlob({ ...validBlob, Matches: [{}] }),
    ).toThrow();
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Matches: [{ chats: [{ body: "hello", timestamp: "not-a-timestamp" }] }],
      }),
    ).toThrow();
  });

  it("rejects impossible and clearly future provider timestamps", () => {
    for (const timestamp of [
      "2026-02-30T12:00:00.000Z",
      "2099-01-01T00:00:00.000Z",
    ]) {
      expect(() =>
        parseAnonymizedHingeBlob({
          ...validBlob,
          Matches: [{ match: [{ timestamp }] }],
        }),
      ).toThrow();
    }
  });

  it("enforces account and prompt chronology", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          account: {
            signup_time: "2025-01-02T00:00:00.000Z",
            last_seen: "2025-01-01T00:00:00.000Z",
          },
        },
      }),
    ).toThrow("last_seen");

    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Prompts: [
          {
            id: 1,
            type: "text",
            created: "2025-01-02T00:00:00.000Z",
            user_updated: "2025-01-01T00:00:00.000Z",
          },
        ],
      }),
    ).toThrow("user_updated");
  });

  it("enforces chronology within one persisted millisecond", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          account: {
            signup_time: "2025-01-01 00:00:00.123850",
            last_seen: "2025-01-01 00:00:00.123522",
          },
        },
      }),
    ).toThrow("last_seen");

    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Prompts: [
          {
            id: 1,
            type: "text",
            created: "2025-01-01 00:00:00.123850",
            user_updated: "2025-01-01 00:00:00.123522",
          },
        ],
      }),
    ).toThrow("user_updated");
  });

  it("rejects prompt rows without a persistable provider type", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Prompts: [
          {
            id: 1,
            type: "",
            created: "2025-01-01T00:00:00.000Z",
            user_updated: "2025-01-01T00:00:00.000Z",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects duplicate provider prompt ids", () => {
    const prompt = {
      id: 1,
      type: "text",
      created: "2025-01-01T00:00:00.000Z",
      user_updated: "2025-01-01T00:00:00.000Z",
    };

    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Prompts: [prompt, { ...prompt, text: "duplicate" }],
      }),
    ).toThrow("duplicate provider prompt id");
  });

  it("rejects values that cannot be represented faithfully in integer columns", () => {
    const invalidPreferences = [
      { distance_miles_max: -1 },
      { distance_miles_max: 12.5 },
      { age_min: 35, age_max: 30 },
      { height_min: 190, height_max: 170 },
    ];

    for (const preferences of invalidPreferences) {
      expect(() =>
        parseAnonymizedHingeBlob({
          ...validBlob,
          User: { ...validBlob.User, preferences },
        }),
      ).toThrow();
    }

    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        User: {
          ...validBlob.User,
          profile: { age: 30, height_centimeters: 182.5 },
        },
      }),
    ).toThrow();
  });

  it("validates JSON-encoded arrays before transforms cast their entries", () => {
    const parsed = parseAnonymizedHingeBlob({
      ...validBlob,
      User: {
        ...validBlob.User,
        preferences: { ethnicity_preference: '["Asian","Latino"]' },
        profile: { age: 30, workplaces: '["Example Co"]' },
      },
    });
    expect(parsed.User.profile.workplaces).toBe('["Example Co"]');

    for (const profileValue of ['["Example Co",42]', "not-json"]) {
      expect(() =>
        parseAnonymizedHingeBlob({
          ...validBlob,
          User: {
            ...validBlob.User,
            profile: { age: 30, workplaces: profileValue },
          },
        }),
      ).toThrow();
    }
  });

  it("quarantines multiple match events in one provider thread", () => {
    expect(() =>
      parseAnonymizedHingeBlob({
        ...validBlob,
        Matches: [
          {
            match: [
              { timestamp: "2025-01-01T00:00:00.000Z" },
              { timestamp: "2025-01-02T00:00:00.000Z" },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});

describe("sanitizeAnonymizedHingeBlob", () => {
  it("deeply strips raw identifiers while retaining allowlisted activity", () => {
    const sanitized = sanitizeAnonymizedHingeBlob({
      ...validBlob,
      private_root_field: "remove me",
      Subscriptions: [{ plan: "premium" }],
      User: {
        ...validBlob.User,
        identity: {
          email: "person@example.com",
          has_email: true,
        },
        account: {
          ...validBlob.User.account,
          device_model: "iPhone",
        },
        installs: [
          {
            install_time: "2020-01-01T00:00:00.000Z",
            ip_address: "203.0.113.1",
            network_name: "private wifi",
          },
        ],
        profile: {
          age: 30,
          first_name: "Private",
          has_first_name: true,
        },
      },
      Matches: [
        {
          chats: [
            {
              body: "hello",
              timestamp: "2026-01-02T00:00:00.000Z",
              recipient_id: "private",
            },
          ],
          other_person: "private",
        },
      ],
    });

    expect(sanitized).not.toHaveProperty("private_root_field");
    expect(sanitized).not.toHaveProperty("Subscriptions");
    expect(sanitized.User.identity).toEqual({ has_email: true });
    expect(sanitized.User.account).toEqual(validBlob.User.account);
    expect(sanitized.User.installs).toEqual([
      { install_time: "2020-01-01T00:00:00.000Z" },
    ]);
    expect(sanitized.User.profile).toEqual({
      age: 30,
      has_first_name: true,
    });
    expect(sanitized.Matches).toEqual([
      {
        chats: [
          {
            body: "hello",
            timestamp: "2026-01-02T00:00:00.000Z",
          },
        ],
      },
    ]);
  });
});
