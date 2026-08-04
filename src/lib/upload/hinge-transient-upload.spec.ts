import { describe, expect, it } from "bun:test";

import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import {
  canReuseHingeTransientUpload,
  prepareHingeTransientUpload,
} from "./hinge-transient-upload";

const consent = {
  terms: true,
  sharePhotos: true,
  shareWorkInfo: true,
};

function payload(): SwipestatsHingeProfilePayload {
  return {
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
          chats: [
            {
              body: "hello",
              timestamp: "2025-01-02T00:00:00.000Z",
            },
          ],
        },
      ],
      Prompts: [],
      Media: [{ type: "photo", url: "https://example.com/photo" }],
    },
  } as SwipestatsHingeProfilePayload;
}

describe("Hinge transient upload identity", () => {
  it("reuses only the exact consent-filtered serialized payload", () => {
    const original = payload();
    const prepared = prepareHingeTransientUpload(original, consent);
    const same = prepareHingeTransientUpload(original, consent);
    const changed = prepareHingeTransientUpload(
      {
        ...original,
        anonymizedHingeJson: {
          ...original.anonymizedHingeJson,
          Matches: [
            {
              ...original.anonymizedHingeJson.Matches[0]!,
              chats: [
                {
                  body: "changed after the first attempt",
                  timestamp: "2025-01-02T00:00:00.000Z",
                },
              ],
            },
          ],
        },
      },
      consent,
    );

    expect(
      canReuseHingeTransientUpload(prepared.payloadKey, same.payloadKey),
    ).toBe(true);
    expect(
      canReuseHingeTransientUpload(prepared.payloadKey, changed.payloadKey),
    ).toBe(false);
  });

  it("binds the retry key to the Hinge profile ID and filtered blob body", () => {
    const original = payload();
    const prepared = prepareHingeTransientUpload(original, consent);
    const anotherProfile = prepareHingeTransientUpload(
      { ...original, hingeId: "another-hinge-id" },
      consent,
    );
    const withoutPhotos = prepareHingeTransientUpload(original, {
      ...consent,
      sharePhotos: false,
    });

    expect(anotherProfile.payloadKey).not.toBe(prepared.payloadKey);
    expect(withoutPhotos.payloadKey).not.toBe(prepared.payloadKey);
    const withoutPhotosBody = JSON.parse(withoutPhotos.blobBody) as {
      Media: unknown[];
    };
    expect(withoutPhotosBody.Media).toEqual([]);
  });
});
