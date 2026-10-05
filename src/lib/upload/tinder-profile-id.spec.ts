import { describe, expect, test } from "bun:test";
import {
  assertTinderProfileIdMatchesExport,
  deriveTinderProfileIdFromExport,
} from "./tinder-profile-id";
const identity = {
  User: {
    birth_date: "1990-04-12T00:00:00.000Z",
    create_date: "2018-07-03T14:25:00.000Z",
  },
};
describe("Tinder profile ID derivation", () => {
  test("accepts only an export that derives the requested profile ID", async () => {
    const tinderId = await deriveTinderProfileIdFromExport(identity);
    await assertTinderProfileIdMatchesExport(tinderId, identity);
    let error: unknown;
    try {
      await assertTinderProfileIdMatchesExport("0".repeat(64), identity);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Uploaded Tinder data does not match the requested profile.",
    );
  });
});
