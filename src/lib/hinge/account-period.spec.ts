import { describe, expect, it } from "bun:test";

import {
  getEarliestHingeAccountSignup,
  getForwardHingeAccountMergePeriod,
  isSameHingeAccountSignup,
} from "./account-period";

describe("Hinge account periods", () => {
  it("keeps the newest account signup separate from earliest merged history", () => {
    expect(
      getForwardHingeAccountMergePeriod(
        {
          createDate: new Date("2022-01-01T00:00:00.000Z"),
          firstAccountCreateDate: new Date("2020-01-01T00:00:00.000Z"),
        },
        new Date("2024-01-01T00:00:00.000Z"),
      ),
    ).toEqual({
      createDate: new Date("2024-01-01T00:00:00.000Z"),
      firstAccountCreateDate: new Date("2020-01-01T00:00:00.000Z"),
    });
  });

  it("uses legacy createDate when the earliest-history field is absent", () => {
    expect(
      getEarliestHingeAccountSignup(
        {
          createDate: new Date("2021-01-01T00:00:00.000Z"),
          firstAccountCreateDate: null,
        },
        new Date("2021-01-01T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("2021-01-01T00:00:00.000Z");
  });

  it("rejects a backward account merge", () => {
    expect(() =>
      getForwardHingeAccountMergePeriod(
        {
          createDate: new Date("2024-01-01T00:00:00.000Z"),
          firstAccountCreateDate: new Date("2020-01-01T00:00:00.000Z"),
        },
        new Date("2023-01-01T00:00:00.000Z"),
      ),
    ).toThrow("older account to a newer account");
  });

  it("recognizes an exact signup instant across historical ID versions", () => {
    expect(
      isSameHingeAccountSignup(
        new Date("2024-01-01T12:34:56.789Z"),
        new Date("2024-01-01T12:34:56.789Z"),
      ),
    ).toBe(true);
    expect(
      isSameHingeAccountSignup(
        new Date("2024-01-01T12:34:56.789Z"),
        new Date("2024-01-01T12:34:56.790Z"),
      ),
    ).toBe(false);
  });

  it("rejects invalid signup dates", () => {
    expect(() =>
      isSameHingeAccountSignup(
        new Date("invalid"),
        new Date("2024-01-01T00:00:00.000Z"),
      ),
    ).toThrow("valid date");
  });
});
