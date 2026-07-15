import { describe, expect, it } from "bun:test";

import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";
import { transformHingeJsonToProfile } from "./hinge-transform.service";

function blob(country?: string): AnonymizedHingeDataJSON {
  return {
    User: {
      preferences: {},
      identity: {},
      account: {
        signup_time: "2020-01-01T00:00:00.000Z",
        last_seen: "2026-01-01T00:00:00.000Z",
      },
      installs: [],
      location: country ? { country } : undefined,
      profile: { age: 30 },
    },
    Matches: [],
    Prompts: [],
  } as unknown as AnonymizedHingeDataJSON;
}

describe("transformHingeJsonToProfile", () => {
  it("prefers the exported country to the browser-derived fallback", () => {
    const transformed = transformHingeJsonToProfile(blob("NO"), {
      hingeId: "hinge-id",
      userId: "user-id",
      country: "US",
    });

    expect(transformed.country).toBe("NO");
    expect(transformed.createDate.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z",
    );
    expect(transformed.firstAccountCreateDate?.toISOString()).toBe(
      "2020-01-01T00:00:00.000Z",
    );
  });

  it("uses the browser country only when the export has none", () => {
    const transformed = transformHingeJsonToProfile(blob(), {
      hingeId: "hinge-id",
      userId: "user-id",
      country: "US",
    });

    expect(transformed.country).toBe("US");
  });

  it("interprets timezone-less account timestamps as UTC", () => {
    const value = blob();
    value.User.account.signup_time = "2020-01-01 00:30:00.123456";
    value.User.account.last_seen = "2026-01-01T00:30:00.654321";

    const transformed = transformHingeJsonToProfile(value, {
      hingeId: "hinge-id",
      userId: "user-id",
    });

    expect(transformed.createDate.toISOString()).toBe(
      "2020-01-01T00:30:00.123Z",
    );
    expect(transformed.lastSeenAt?.toISOString()).toBe(
      "2026-01-01T00:30:00.654Z",
    );
  });

  it("falls back to the provider gender when gender_identity is empty", () => {
    const value = blob();
    value.User.profile.gender_identity = "";
    value.User.profile.gender = "female";

    const transformed = transformHingeJsonToProfile(value, {
      hingeId: "hinge-id",
      userId: "user-id",
    });

    expect(transformed.gender).toBe("FEMALE");
  });

  it("uses broad provider gender for an unmapped custom identity", () => {
    const value = blob();
    value.User.profile.gender_identity = "Gender Questioning";
    value.User.profile.gender = "male";

    const transformed = transformHingeJsonToProfile(value, {
      hingeId: "hinge-id",
      userId: "user-id",
    });

    expect(transformed.gender).toBe("MALE");
    expect(transformed.genderIdentity).toBe("Gender Questioning");
  });
});
