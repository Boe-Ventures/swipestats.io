/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { canDeleteClaimedAnonymousUser } from "./claim-ownership";

describe("anonymous Tinder profile claims", () => {
  test("deletes the old account only when it is known to own no other data", () => {
    expect(canDeleteClaimedAnonymousUser(false)).toBe(true);
    expect(canDeleteClaimedAnonymousUser(true)).toBe(false);
    expect(canDeleteClaimedAnonymousUser(undefined)).toBe(false);
  });
});
