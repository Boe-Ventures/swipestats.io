import { describe, expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { TransactionClient } from "@/server/db";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  applyConversationMetricRepair,
  assertConversationRepairPostconditions,
  buildConversationMetricAuditQuery,
} = await import("./repair-conversation-metrics");

function queryText(query: SQL): string {
  return new PgDialect().sqlToQuery(query).sql.toLowerCase();
}

function queryParams(query: SQL): unknown[] {
  return new PgDialect().sqlToQuery(query).params;
}

describe("conversation metric repair", () => {
  test("rebuilds matches, conversation meta, and Hinge provider metrics", async () => {
    const queries: SQL[] = [];
    const tx = {
      execute: async (query: SQL) => {
        queries.push(query);
        return { rows: [] };
      },
    } as unknown as TransactionClient;

    await applyConversationMetricRepair(tx, "ALL");

    expect(queries).toHaveLength(7);
    expect(queryText(queries[0]!)).toContain("pg_advisory_xact_lock");
    expect(queryParams(queries[0]!)).toEqual(["swipe-rank:TINDER"]);
    expect(queryText(queries[3]!)).toContain("pg_advisory_xact_lock");
    expect(queryParams(queries[3]!)).toEqual(["swipe-rank:HINGE"]);

    const matchUpdate = queryText(queries[1]!);
    expect(matchUpdate).toContain("lag(message.sent_date)");
    expect(matchUpdate).toContain("floor(extract(");
    expect(matchUpdate).toContain("percentile_cont(0.5)");
    expect(matchUpdate).toContain("+ 0.5");
    expect(matchUpdate).toContain("source_match.id,");
    expect(matchUpdate).not.toContain("source_match.*");
    expect(matchUpdate).toContain("update match");
    expect(matchUpdate).toContain("did_match_reply = null");

    const metaUpdate = queryText(queries[2]!);
    expect(metaUpdate).toContain("update profile_meta");
    expect(metaUpdate).toContain("conversation_duration_days is not null");
    expect(metaUpdate).toContain("+ 0.5");
    expect(metaUpdate).toContain("partition by selected.data_provider");
    expect(metaUpdate).toContain("avg(ordered.gap_seconds)");
    expect(metaUpdate).toContain("is distinct from row");

    expect(queryText(queries[4]!)).toContain("update match");
    expect(queryText(queries[5]!)).toContain("update profile_meta");

    const hingeUpdate = queryText(queries[6]!);
    expect(hingeUpdate).toContain("outbound_like");
    expect(hingeUpdate).toContain("liked_at is not null");
    expect(hingeUpdate).toContain(
      "interaction.timestamp <= source_match.matched_at",
    );
    expect(hingeUpdate).toContain(
      "source_match.liked_at <= source_match.matched_at",
    );
    expect(hingeUpdate).toContain("'inbound_like', 'unknown'");
    expect(hingeUpdate).toContain(
      "group by interaction.hinge_profile_id, interaction.match_id",
    );
    expect(hingeUpdate).toContain("origin.hinge_profile_id = profile.hinge_id");
    expect(hingeUpdate).toContain("linked.hinge_profile_id = profile.hinge_id");
    expect(hingeUpdate).toContain("like_rate = case");
    expect(hingeUpdate).toContain("least(");
    expect(hingeUpdate).toContain("greatest(");
    expect(hingeUpdate).toContain("is distinct from row");
  });

  test("audits every repaired match, metadata, and Hinge-rate field", () => {
    const audit = queryText(buildConversationMetricAuditQuery("ALL"));
    expect(audit).toContain("source_match.message_imbalance_ratio");
    expect(audit).toContain("missing_meta");
    expect(audit).toContain("mismatched_conversation_meta");
    expect(audit).toContain("mismatched_hinge_provider_meta");
    expect(audit).toContain("meta.match_rate");
    expect(audit).toContain("hinge.outbound_matches");
    expect(audit).toContain("both_provider_match_rows");
    expect(audit).toContain("providerless_match_rows");
    expect(audit).toContain("cross_profile_message_links");
    expect(audit).toContain("invalid_hinge_message_to_rows");
    expect(audit).toContain("cross_profile_interaction_links");
    expect(audit).toContain(
      "source_match.hinge_profile_id = interaction.hinge_profile_id",
    );
  });

  test("rejects any nonzero transactional postcondition", () => {
    expect(() =>
      assertConversationRepairPostconditions([
        {
          data_provider: "HINGE",
          mismatched_matches: 0,
          negative_metric_matches: 0,
          message_count_mismatches: 0,
          missing_meta: 1,
          mismatched_conversation_meta: 0,
          mismatched_hinge_provider_meta: 2,
        },
      ]),
    ).toThrow("missing_meta=1");

    expect(() =>
      assertConversationRepairPostconditions([
        {
          data_provider: "TINDER",
          mismatched_matches: 0,
          negative_metric_matches: 0,
          message_count_mismatches: 0,
          missing_meta: 0,
          mismatched_conversation_meta: 0,
          mismatched_hinge_provider_meta: 0,
        },
      ]),
    ).not.toThrow();

    expect(() =>
      assertConversationRepairPostconditions([
        {
          data_provider: "HINGE",
          cross_profile_interaction_links: 1,
        },
      ]),
    ).toThrow("cross_profile_interaction_links=1");
  });
});
