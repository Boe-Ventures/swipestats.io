import { describe, expect, it } from "bun:test";
import assert from "node:assert/strict";
import { resolveTinderUploadTarget } from "./tinder-upload-target";

// A date-derived export fingerprint must never claim another guest's history.
// Static checks cannot prove owner isolation or stable IDs after conversion.
describe("Tinder upload ownership", () => {
  const identity = {
    birthDate: "1995-01-01T00:00:00.000Z",
    createDate: "2020-01-01T00:00:00.000Z",
  };

  it("isolates identical exports by owner and canonicalizes date spellings", async () => {
    const first = await resolveTinderUploadTarget({
      userId: "guest-a",
      ...identity,
    });
    const second = await resolveTinderUploadTarget({
      userId: "registered-b",
      ...identity,
    });
    expect(first.tinderId).not.toBe(second.tinderId);
    expect(
      await resolveTinderUploadTarget({
        userId: "guest-a",
        birthDate: "1995-01-01",
        createDate: "2019-12-31T19:00:00-05:00",
      }),
    ).toEqual(first);
  });

  it("retains an owned legacy or converted profile ID, never a foreign one", async () => {
    const existingProfile = {
      tinderId: "original-public-link",
      userId: "registered-b",
      birthDate: new Date(identity.birthDate),
      createDate: new Date(identity.createDate),
    };
    expect(
      await resolveTinderUploadTarget({
        userId: "registered-b",
        ...identity,
        existingProfile,
      }),
    ).toEqual({ tinderId: existingProfile.tinderId, isSameAccount: true });
    await assert.rejects(
      resolveTinderUploadTarget({
        userId: "guest-a",
        ...identity,
        existingProfile,
      }),
      /another user's Tinder profile/,
    );
    expect(
      (
        await resolveTinderUploadTarget({
          userId: "registered-b",
          ...identity,
          birthDate: "1996-01-01",
          existingProfile,
        })
      ).isSameAccount,
    ).toBe(false);
    expect(
      (
        await resolveTinderUploadTarget({
          userId: "registered-b",
          ...identity,
          createDate: "2021-01-01",
          existingProfile,
        })
      ).isSameAccount,
    ).toBe(false);
  });
});
