import { describe, expect, it } from "bun:test";

import { extractHingeData, isValidHingeJson } from "./extract-hinge-data";
import type { FullHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";

function userFile(age = 30) {
  return {
    preferences: {},
    identity: {
      email: "person@example.com",
      fbid: "sensitive-facebook-id",
      phone_number: "+15555550123",
    },
    account: {
      signup_time: "2020-01-01T00:00:00.000Z",
      last_seen: "2026-07-01T00:00:00.000Z",
      device_model: "sensitive-account-device",
    },
    installs: [
      {
        install_time: "2020-01-01T00:00:00.000Z",
        ip_address: "203.0.113.11",
        idfa: "sensitive-idfa",
        network_name: "sensitive-network-name",
      },
    ],
    devices: [
      {
        device_id: "sensitive-device-id",
        ip_address: "203.0.113.10",
        user_agent: "sensitive-user-agent",
        device_platform: "ios",
      },
    ],
    profile: {
      first_name: "Example",
      last_name: "Person",
      age,
    },
  };
}

describe("extractHingeData", () => {
  it("does not let empty array sidecars overwrite a non-empty matches file", async () => {
    const matchThread = {
      like: [{ timestamp: "2026-01-01T00:00:00.000Z", like: [] }],
    };

    const result = await extractHingeData([
      JSON.stringify(userFile()),
      JSON.stringify([matchThread]),
      JSON.stringify([]),
      JSON.stringify([]),
    ]);

    expect(result.anonymizedHingeJson.Matches).toEqual([matchThread]);
    expect(result.anonymizedHingeJson.Prompts).toBeUndefined();
  });

  it("distinguishes an omitted prompts sidecar from an explicit empty file", async () => {
    const parts = [
      JSON.stringify(userFile()),
      JSON.stringify([
        { like: [{ timestamp: "2026-01-01T00:00:00.000Z", like: [] }] },
      ]),
      JSON.stringify([]),
    ];

    const omitted = await extractHingeData(parts);
    const explicitEmpty = await extractHingeData(parts, { prompts: true });

    expect(omitted.anonymizedHingeJson.Prompts).toBeUndefined();
    expect(explicitEmpty.anonymizedHingeJson.Prompts).toEqual([]);
  });

  it("recognizes prompts even when the prompt text itself is absent", async () => {
    const prompt = {
      id: 1,
      type: "text",
      text: "An answer",
      created: "2026-01-01T00:00:00.000Z",
      user_updated: "2026-01-01T00:00:00.000Z",
    };

    const result = await extractHingeData([
      JSON.stringify(userFile()),
      JSON.stringify([prompt]),
    ]);

    expect(result.anonymizedHingeJson.Prompts).toEqual([prompt]);
  });

  it("removes account and device identifiers before blob upload", async () => {
    const result = await extractHingeData([
      JSON.stringify(userFile()),
      JSON.stringify([
        { like: [{ timestamp: "2026-01-01T00:00:00.000Z", like: [] }] },
      ]),
      JSON.stringify([{ plan: "sensitive-subscription" }]),
    ]);

    expect(result.anonymizedHingeJson.User.identity).not.toHaveProperty("fbid");
    expect(result.anonymizedHingeJson.User.devices?.[0]).not.toHaveProperty(
      "device_id",
    );
    expect(result.anonymizedHingeJson.User.devices?.[0]).not.toHaveProperty(
      "ip_address",
    );
    expect(result.anonymizedHingeJson.User.account).not.toHaveProperty(
      "device_model",
    );
    expect(result.anonymizedHingeJson.User.installs[0]).toEqual({
      install_time: "2020-01-01T00:00:00.000Z",
    });
    expect(result.anonymizedHingeJson.User.profile).not.toHaveProperty(
      "first_name",
    );
    expect(result.anonymizedHingeJson).not.toHaveProperty("Subscriptions");

    const serialized = JSON.stringify(result.anonymizedHingeJson);
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("sensitive-network-name");
    expect(serialized).not.toContain("sensitive-subscription");
  });

  it("recognizes a voice-note-only matches file", async () => {
    const voiceNoteThread = {
      voice_notes: [
        {
          timestamp: "2026-01-01T00:00:00.000Z",
          url: "https://example.com/voice-note",
        },
      ],
    };

    const result = await extractHingeData([
      JSON.stringify(userFile()),
      JSON.stringify([voiceNoteThread]),
    ]);

    expect(result.anonymizedHingeJson.Matches).toEqual([voiceNoteThread]);
  });
});

describe("isValidHingeJson", () => {
  it("rejects implausible ages and invalid signup timestamps", () => {
    const data = {
      User: userFile(12),
      Matches: [{ like: [{ timestamp: "2026-01-01", like: [] }] }],
      Prompts: [],
    } as unknown as FullHingeDataJSON;
    data.User.account.signup_time = "not-a-date";

    const [valid, errors] = isValidHingeJson(data);

    expect(valid).toBe(false);
    expect(errors.birth_date).toBeDefined();
    expect(errors.create_date).toBeDefined();
  });
});
