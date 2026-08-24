import { describe, expect, test } from "bun:test";

import { SWIPESTATS_HOME_MARKDOWN } from "./agent-content";

describe("agent-readable homepage", () => {
  test("has a useful document outline and substantial raw content", () => {
    expect(SWIPESTATS_HOME_MARKDOWN.startsWith("# SwipeStats\n")).toBe(true);
    expect(SWIPESTATS_HOME_MARKDOWN.match(/^## /gm)?.length).toBeGreaterThan(2);
    expect(SWIPESTATS_HOME_MARKDOWN.length).toBeGreaterThan(500);
  });

  test("points agents to recovery and policy resources", () => {
    expect(SWIPESTATS_HOME_MARKDOWN).toContain("/llms.txt");
    expect(SWIPESTATS_HOME_MARKDOWN).toContain("/sitemap.xml");
    expect(SWIPESTATS_HOME_MARKDOWN).toContain("/privacy");
  });
});
