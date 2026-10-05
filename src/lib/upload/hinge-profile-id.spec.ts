import { describe, expect, it } from "bun:test";
import { assertHingeProfileIdMatchesExport } from "./hinge-profile-id";
describe("Hinge profile identity", () => {
  const hingeJson = {
    User: { account: { signup_time: "2020-01-02T03:04:05.000Z" } },
  };
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
