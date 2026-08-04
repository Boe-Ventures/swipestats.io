import { describe, expect, it } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { buildHingeLikeLinkCollisionAuditQuery } =
  await import("./audit-hinge-like-link-collisions");

function queryText(query: SQL): string {
  return new PgDialect().sqlToQuery(query).sql.toLowerCase();
}

describe("Hinge pending-to-matched like collision audit", () => {
  it("is read-only and preserves exact timestamp/comment multiplicity", () => {
    const query = queryText(buildHingeLikeLinkCollisionAuditQuery(25));

    expect(query).toContain("where type = 'like_sent'");
    expect(query).toContain("group by hinge_profile_id, timestamp, comment");
    expect(query).toContain("bool_or(match_id is null)");
    expect(query).toContain("bool_or(match_id is not null)");
    expect(query).toContain("unlinked_count");
    expect(query).toContain("linked_count");
    expect(query).toContain("md5(coalesce(comment, ''))");
    expect(query).not.toContain("delete from");
    expect(query).not.toContain("update hinge_interaction");
    expect(query).not.toContain("insert into");
  });
});
