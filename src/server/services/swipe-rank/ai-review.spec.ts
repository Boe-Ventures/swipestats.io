import { describe, expect, test } from "bun:test";
import { redactSwipeRankReviewMessage } from "./ai-review.contract";
describe("SwipeRank AI review", () => {
  test("redacts contactable message details before model review", () => {
    expect(
      redactSwipeRankReviewMessage(
        "Email me at person@example.com or +1 (415) 555-1212, @private_name https://example.com/me",
      ),
    ).toBe("Email me at [EMAIL] or [PHONE_NUMBER], [SOCIAL_HANDLE] [URL]");
  });
});
