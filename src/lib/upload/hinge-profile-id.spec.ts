import { describe, expect, it } from "bun:test";

import {
  assertHingeProfileIdMatchesExport,
  deriveHingeProfileId,
  deriveHingeProfileIdFromExport,
} from "./hinge-profile-id";

describe("Hinge profile identity", () => {
  const hingeJson = {
    User: { account: { signup_time: "2020-01-02T03:04:05.000Z" } },
  };

  it("preserves the established v2 spelling contract", async () => {
    const fromExport = await deriveHingeProfileIdFromExport(hingeJson);
    const fromLegacySpaceForm = await deriveHingeProfileId(
      "2020-01-02 03:04:05.000",
    );
    const withoutFraction = await deriveHingeProfileId("2020-01-02T03:04:05Z");
    const equivalentOffset = await deriveHingeProfileId(
      "2020-01-02T04:04:05+01:00",
    );

    expect(fromExport).toBe(fromLegacySpaceForm);
    expect(fromExport).toBe(
      "0c1240f2b7a7c6e5adb4eb38129744444cbeee4ac1e98419cec160e6bd697f62",
    );
    expect(fromExport).not.toBe(withoutFraction);
    expect(fromExport).not.toBe(equivalentOffset);
  });

  it("rejects invalid signup timestamps before hashing", async () => {
    let error: unknown;
    try {
      await deriveHingeProfileId("not-a-date");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Hinge signup time is invalid.");
  });

  it("rejects a request ID that does not belong to the blob", async () => {
    let error: unknown;
    try {
      await assertHingeProfileIdMatchesExport("wrong-id", hingeJson);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Uploaded Hinge data does not match the requested profile.",
    );
  });
});
