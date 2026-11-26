import { describe, expect, it } from "bun:test";
import type {} from "drizzle-orm";
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
const { assertHingeMediaEvidencePostconditions } =
  await import("./repair-hinge-media-duplicates");
describe("Hinge duplicate-media repair", () => {
  it("aborts before deletion when nonblank duplicate evidence conflicts", () => {
    expect(() =>
      assertHingeMediaEvidencePostconditions({
        evidence_gaps: 0,
        evidence_conflicts: 1,
      }),
    ).toThrow("conflicting nonblank values");
  });
});
