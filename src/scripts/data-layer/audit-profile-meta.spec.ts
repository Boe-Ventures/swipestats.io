import { describe, expect, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const {
  buildHingeCoreReconciliationQuery,
  buildTinderConversationReconciliationQuery,
} = await import("./audit-profile-meta");

function queryText(query: SQL): string {
  return new PgDialect()
    .sqlToQuery(query)
    .sql.toLowerCase()
    .replaceAll(/\s+/g, " ");
}

describe("profile-meta audit parity", () => {
  test("weights every adjacent message gap instead of weighting conversations equally", () => {
    const query = queryText(buildTinderConversationReconciliationQuery());

    // A thread with three cadence gaps must contribute three observations while
    // a thread with one gap contributes one. Averaging match medians would give
    // both threads equal weight and does not match the runtime/repair contract.
    expect(query).toContain("partition by source_match.id");
    expect(query).toContain(
      'order by message.sent_date, message."order", message.id',
    );
    expect(query).toContain("pooled_profile_gaps as");
    expect(query).toContain("floor(avg(gap_seconds) + 0.5)");
    expect(query).toContain("pooled.mean_response_time_seconds");
    expect(query).not.toContain("avg(response_time_median_seconds)");

    // Conversation-size metrics are rebuilt from message rows too, so stale
    // match totals cannot make stale profile metadata look correct.
    expect(query).toContain("count(msg.match_id)");
    expect(query).toContain(
      "matches.actual_message_rows <> matches.total_message_count",
    );

    // Tinder `to` is a match reference, unlike Hinge's direction-shaped field.
    expect(query).toContain("invalid_message_reference_rows");
    expect(query).toContain('msg."to" is null or msg."to" < 0');
    expect(query).not.toContain('msg."to" is distinct from 1');
  });

  test("preserves explicit UNKNOWN and rejects post-match outbound evidence", () => {
    const query = queryText(buildHingeCoreReconciliationQuery());

    expect(query).toContain("'outbound_like', 'inbound_like', 'unknown'");
    expect(query).toContain(
      "when origin.explicit_origin_count = 1 then origin.thread_origin",
    );
    expect(query).toContain("interaction.timestamp <= source_match.matched_at");
    expect(query).toContain("source_match.liked_at <= source_match.matched_at");
    expect(query).toContain("else 'unknown'");
  });

  test("counts only outgoing Hinge messages and audits the provider invariant", () => {
    const query = queryText(buildHingeCoreReconciliationQuery());

    expect(query).toContain('filter (where message."to" = 1)');
    expect(query).toContain('filter ( where message."to" is distinct from 1 )');
    expect(query).toContain("non_outgoing_message_rows");
    expect(query).toContain("message_provider_link_mismatches");
  });

  test("includes earliest account signup and all activity in Hinge bounds", () => {
    const query = queryText(buildHingeCoreReconciliationQuery());

    expect(query).toContain(
      "coalesce(profile.first_account_create_date, profile.create_date)",
    );
    expect(query).toContain("least(");
    expect(query).toContain("greatest(");
    expect(query).toContain(
      "select source_match.hinge_profile_id, source_match.initial_message_at",
    );
    expect(query).toContain(
      "select source_match.hinge_profile_id, source_match.last_message_at",
    );
    expect(query).toContain("expected_days_in_period");
    expect(query).toContain("profile_period_mismatches");
  });
});
