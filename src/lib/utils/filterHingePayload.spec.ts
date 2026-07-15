import { describe, expect, it } from "bun:test";

import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { filterPayloadByConsent } from "./filterHingePayload";

describe("filterPayloadByConsent", () => {
  it("removes optional photos/work without a latent core-data opt-out", () => {
    const payload = {
      hingeId: "hinge-id",
      anonymizedHingeJson: {
        User: {
          preferences: {},
          identity: {},
          account: {
            signup_time: "2020-01-01T00:00:00.000Z",
            last_seen: "2026-01-01T00:00:00.000Z",
          },
          installs: [],
          profile: {
            age: 30,
            job_title: "Engineer",
            job_title_displayed: true,
            workplaces: '["Example"]',
            workplaces_displayed: true,
          },
        },
        Matches: [
          {
            match: [{ timestamp: "2025-01-01T00:00:00.000Z" }],
            chats: [{ body: "hello", timestamp: "2025-01-02T00:00:00.000Z" }],
          },
        ],
        Prompts: [
          {
            id: 1,
            type: "text",
            text: "answer",
            created: "2025-01-01T00:00:00.000Z",
            user_updated: "2025-01-01T00:00:00.000Z",
          },
        ],
        Media: [{ type: "photo", url: "https://example.com/photo" }],
      },
    } as SwipestatsHingeProfilePayload;

    const filtered = filterPayloadByConsent(payload, {
      terms: true,
      sharePhotos: false,
      shareWorkInfo: false,
    });

    expect(filtered.anonymizedHingeJson.Media).toEqual([]);
    expect(filtered.anonymizedHingeJson.User.profile).toMatchObject({
      job_title: "",
      job_title_displayed: false,
      workplaces: "",
      workplaces_displayed: false,
    });
    expect(filtered.anonymizedHingeJson.Matches).toEqual(
      payload.anonymizedHingeJson.Matches,
    );
    expect(filtered.anonymizedHingeJson.Prompts).toEqual(
      payload.anonymizedHingeJson.Prompts,
    );
  });
});
