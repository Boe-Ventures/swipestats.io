import { describe, expect, mock, test } from "bun:test";
import assert from "node:assert/strict";
import { call } from "@orpc/server";
import type { DomainContext } from "./context";
import { tinderBenchmarkProcedure } from "./procedure";
import { swipeRankRouter } from "./swipeRank/router";

function context({
  tier = "FREE",
  periodEnd = null,
  lifetime = false,
  ownerId = "fixture-owner",
  signedIn = true,
  missingUser = false,
}: {
  tier?: "FREE" | "PLUS" | "ELITE";
  periodEnd?: Date | null;
  lifetime?: boolean;
  ownerId?: string;
  signedIn?: boolean;
  missingUser?: boolean;
} = {}): DomainContext {
  return {
    headers: new Headers(),
    analyticsConsent: null,
    // A stale or forged paid session must never override the database tier.
    session: signedIn
      ? {
          user: {
            id: "fixture-owner",
            swipestatsTier: "ELITE",
            isLifetime: true,
          },
          session: { id: "fixture-session" },
        }
      : null,
    db: {
      query: {
        tinderProfileTable: {
          findFirst: async () => ({ userId: ownerId }),
        },
        userTable: {
          findFirst: async () =>
            missingUser
              ? undefined
              : {
                  swipestatsTier: tier,
                  isLifetime: lifetime,
                  subscriptionCurrentPeriodEnd: periodEnd,
                },
        },
      },
    },
  } as unknown as DomainContext;
}

describe("paid cohort benchmark access", () => {
  test("the actual benchmark route rejects free and expired accounts for both fields", async () => {
    for (const options of [
      {},
      { tier: "PLUS" as const, periodEnd: new Date("2000-01-01") },
      { tier: "ELITE" as const },
    ]) {
      for (const filters of [
        undefined,
        { gender: "MALE" as const, interestedIn: "FEMALE" as const },
      ]) {
        await assert.rejects(
          call(
            swipeRankRouter.benchmark,
            {
              tinderId: "fixture-profile",
              period: { kind: "MONTH", start: "2025-12-01", end: "2026-01-01" },
              filters,
            },
            { context: context(options) },
          ),
          { code: "FORBIDDEN" },
        );
      }
    }
  });

  test("active Plus, Elite and lifetime owners reach the protected handler", async () => {
    const handler = mock(() => "allowed");
    const procedure = tinderBenchmarkProcedure.handler(handler);
    const future = new Date(Date.now() + 86_400_000);
    for (const options of [
      { tier: "PLUS" as const, periodEnd: future },
      { tier: "ELITE" as const, periodEnd: future },
      { tier: "PLUS" as const, lifetime: true },
    ]) {
      expect(
        await call(
          procedure,
          { tinderId: "fixture-profile" },
          { context: context(options) },
        ),
      ).toBe("allowed");
    }
    expect(handler).toHaveBeenCalledTimes(3);
  });

  test("paid access does not bypass authentication or profile ownership", async () => {
    const handler = mock(() => "allowed");
    const procedure = tinderBenchmarkProcedure.handler(handler);
    for (const [options, code] of [
      [{ signedIn: false }, "UNAUTHORIZED"],
      [{ missingUser: true }, "UNAUTHORIZED"],
      [{ ownerId: "another-owner" }, "FORBIDDEN"],
    ] as const) {
      await assert.rejects(
        call(
          procedure,
          { tinderId: "fixture-profile" },
          {
            context: context({ tier: "PLUS", lifetime: true, ...options }),
          },
        ),
        { code },
      );
    }
    expect(handler).not.toHaveBeenCalled();
  });
});
