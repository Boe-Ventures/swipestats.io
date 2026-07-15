import { describe, expect, test } from "bun:test";

import { retirement } from "./repair-profile-meta";

describe("retired profile metadata repair", () => {
  test("cannot open or mutate the database and points to canonical repairs", () => {
    expect(retirement.status).toBe("retired");
    expect(retirement.databaseOpened).toBe(false);
    expect(retirement.reason).toContain("superseded conversation-derived");
    expect(retirement.replacement.audit).toContain("audit-profile-meta");
    expect(retirement.replacement.tinderCalendarDryRun).toContain(
      "repair-tinder-dates",
    );
    expect(retirement.replacement.tinderConversationDryRun).toContain(
      "repair-conversations",
    );
    expect(retirement.guidance).toContain("do not invent a row");
  });
});
