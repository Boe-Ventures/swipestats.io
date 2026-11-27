import { describe, expect, test } from "bun:test";
import { oauthGrantAllows, oauthPermissions } from "./mcp-permissions";

// Existing read-only clients must not silently gain access to a private diary.
// Revocation/downgrades must also defeat an otherwise unexpired full-access JWT.
describe("SwipeStats account grants", () => {
  test("one new grant covers analytics and diary tools; old grants stay read-only", () => {
    expect(oauthPermissions(["swipestats:all"])).toEqual([
      "swipestats:read",
      "loveStories:read",
      "loveStories:write",
    ]);
    expect(oauthPermissions(["swipestats:read"])).toEqual(["swipestats:read"]);
    expect(oauthPermissions(["openid", "loveStories:write"])).toEqual([]);
  });
  test("both the token and the current account consent must authorize the operation", () => {
    expect(
      oauthGrantAllows(
        ["swipestats:all"],
        ["swipestats:all"],
        "loveStories:write",
      ),
    ).toBe(true);
    expect(oauthGrantAllows(["swipestats:all"], [], "loveStories:write")).toBe(
      false,
    );
    expect(
      oauthGrantAllows(
        ["swipestats:all"],
        ["swipestats:read"],
        "loveStories:write",
      ),
    ).toBe(false);
    expect(
      oauthGrantAllows(
        ["swipestats:read"],
        ["swipestats:all"],
        "loveStories:read",
      ),
    ).toBe(false);
  });
});
