import { describe, expect, it } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  assertHingeMediaEvidencePostconditions,
  buildHingeMediaEvidenceAuditQuery,
  buildHingeMediaEvidenceMergeQuery,
} = await import("./repair-hinge-media-duplicates");

function queryText(query: SQL): string {
  return new PgDialect().sqlToQuery(query).sql.toLowerCase();
}

describe("Hinge duplicate-media repair", () => {
  it("fieldwise merges complementary evidence before duplicate deletion", () => {
    const merge = queryText(buildHingeMediaEvidenceMergeQuery());

    expect(merge).toContain("update media as winner");
    expect(merge).toContain("prompt = coalesce");
    expect(merge).toContain("from_so_me = coalesce");
    expect(merge).toContain("caption = coalesce");
    expect(merge).toContain("type = coalesce");
    expect(merge).toContain("winner.type");
    expect(merge).toContain("order by id");
    expect(merge).toContain("bool_or(from_so_me)");
  });

  it("has a pre-delete postcondition for every merged evidence field", () => {
    const audit = queryText(buildHingeMediaEvidenceAuditQuery());

    expect(audit).toContain("evidence_gaps");
    expect(audit).toContain("merged_prompt");
    expect(audit).toContain("merged_from_so_me");
    expect(audit).toContain("merged_caption");
    expect(audit).toContain("merged_type");
    expect(audit).toContain("evidence_conflicts");
    expect(audit).toContain("count(distinct nullif(btrim(prompt), ''))");
    expect(audit).toContain("count(distinct nullif(btrim(caption), ''))");
    expect(audit).toContain("count(distinct nullif(btrim(type), ''))");
  });

  it("aborts before deletion when nonblank duplicate evidence conflicts", () => {
    expect(() =>
      assertHingeMediaEvidencePostconditions({
        evidence_gaps: 0,
        evidence_conflicts: 1,
      }),
    ).toThrow("conflicting nonblank values");
  });
});
