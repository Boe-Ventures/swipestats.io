import { describe, expect, test } from "bun:test";

import { evaluateAdminAccess } from "./admin-access";

describe("evaluateAdminAccess", () => {
  test("never grants unauthenticated admin access", () => {
    expect(evaluateAdminAccess({ identity: null })).toEqual({
      isAuthorized: false,
      reason: "unauthenticated",
    });
  });

  test("authorizes a verified configured admin", () => {
    expect(
      evaluateAdminAccess({
        identity: {
          email: "  KRIS@SWIPESTATS.IO ",
          emailVerified: true,
        },
      }),
    ).toEqual({ isAuthorized: true, reason: "admin" });

    expect(
      evaluateAdminAccess({
        identity: { email: "paw@swipestats.io", emailVerified: true },
      }),
    ).toEqual({ isAuthorized: true, reason: "admin" });
  });

  test("rejects a configured admin address until it is verified", () => {
    expect(
      evaluateAdminAccess({
        identity: { email: "kris@swipestats.io", emailVerified: false },
      }),
    ).toEqual({ isAuthorized: false, reason: "email-unverified" });

    expect(
      evaluateAdminAccess({
        identity: { email: "kris@swipestats.io" },
      }),
    ).toEqual({ isAuthorized: false, reason: "email-unverified" });
  });

  test("rejects an authenticated non-admin", () => {
    expect(
      evaluateAdminAccess({
        identity: { email: "user@example.com", emailVerified: true },
      }),
    ).toEqual({ isAuthorized: false, reason: "not-admin" });
  });
});
