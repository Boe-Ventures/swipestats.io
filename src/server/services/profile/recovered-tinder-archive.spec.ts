import { describe, expect, it } from "bun:test";

import {
  buildRecoveredTinderArchive,
  recoveredTinderArchivePath,
} from "./recovered-tinder-archive";

describe("recovered Tinder archives", () => {
  it("keeps the deleted-upload provenance separate from derived state", () => {
    const archive = buildRecoveredTinderArchive({
      tinderId: "profile-1",
      recoveredAt: new Date("2026-08-13T10:00:00.000Z"),
      receipts: [
        {
          id: "upload-1",
          committedAt: new Date("2026-08-04T10:00:00.000Z"),
          cleanedAt: new Date("2026-08-04T10:00:01.000Z"),
          originalBlobUrl: "https://blob.example/transient.json",
        },
      ],
      profile: { tinderId: "profile-1" },
      usage: [{ dateStampRaw: "2026-08-01" }],
      matches: [],
      messages: [],
      media: [],
      jobs: [],
      schools: [],
    });

    expect(archive).toEqual({
      format: "swipestats.tinder-derived-state-recovery.v1",
      recovery: {
        recoveredAt: "2026-08-13T10:00:00.000Z",
        limitation:
          "The original anonymized Tinder export was deleted by the transient upload pipeline. This is a reconstruction from the current normalized SwipeStats state, not the original provider file.",
        replacesDeletedTransientUploads: [
          {
            id: "upload-1",
            committedAt: "2026-08-04T10:00:00.000Z",
            cleanedAt: "2026-08-04T10:00:01.000Z",
            originalBlobUrl: "https://blob.example/transient.json",
          },
        ],
      },
      tinderId: "profile-1",
      derivedState: {
        profile: { tinderId: "profile-1" },
        usage: [{ dateStampRaw: "2026-08-01" }],
        matches: [],
        messages: [],
        media: [],
        jobs: [],
        schools: [],
      },
    });
  });

  it("uses a non-transient namespace", () => {
    expect(recoveredTinderArchivePath("profile-1")).toBe(
      "recovered-tinder-archives/profile-1/derived-state.json",
    );
  });
});
