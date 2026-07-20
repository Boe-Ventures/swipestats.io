import { describe, expect, test } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { profileMetaTable } from "./schema";

function profileMetaCheckSql(name: string): string {
  const check = getTableConfig(profileMetaTable).checks.find(
    (candidate) => candidate.name === name,
  );
  if (!check) throw new Error(`Missing profile_meta check ${name}`);
  return new PgDialect().sqlToQuery(check.value).sql.toLowerCase();
}

describe("profile_meta constraints", () => {
  test("bounds active days and the universally bounded like rate", () => {
    const period = profileMetaCheckSql("profile_meta_period_bounds");
    expect(period).toContain('"daysactive" <= "profile_meta"."daysinperiod"');

    const core = profileMetaCheckSql("profile_meta_nonnegative_core_metrics");
    expect(core).toContain('"likerate" >= 0');
    expect(core).toContain('"likerate" <= 1');
  });

  test("keeps conversation counts internally consistent", () => {
    const conversation = profileMetaCheckSql(
      "profile_meta_conversation_counts",
    );
    expect(conversation).toContain('"conversationcount" >= 0');
    expect(conversation).toContain(
      '"conversationswithmessages" <= "profile_meta"."conversationcount"',
    );
    expect(conversation).toContain(
      '"ghostedcount" = "profile_meta"."conversationcount" - "profile_meta"."conversationswithmessages"',
    );
  });
});
