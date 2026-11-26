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
