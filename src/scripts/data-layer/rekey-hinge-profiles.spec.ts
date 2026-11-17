import { describe, expect, it } from "bun:test";
import { validateHingeRekeyPlan } from "./rekey-hinge-profiles";

describe("historical Hinge re-key", () => {
  it("rejects a wrong database or colliding plan before any writes", () => {
    const plan = {
      version: 1,
      target: "reviewed-endpoint",
      generatedAt: "2026-01-01T00:00:00.000Z",
      rows: [
        {
          oldId: "old-profile",
          newId: "a".repeat(64),
          ownerId: "owner",
          signupTime: "2020-01-01T00:00:00.000Z",
        },
      ],
    };
    expect(() => validateHingeRekeyPlan(plan, "another-endpoint")).toThrow(
      "different database",
    );
    expect(() =>
      validateHingeRekeyPlan(
        {
          ...plan,
          rows: [...plan.rows, { ...plan.rows[0], oldId: "second-profile" }],
        },
        plan.target,
      ),
    ).toThrow("duplicate or overlapping");
    expect(() =>
      validateHingeRekeyPlan(
        { ...plan, rows: [{ ...plan.rows[0], oldId: "a".repeat(64) }] },
        plan.target,
      ),
    ).toThrow("duplicate or overlapping");
  });
});
