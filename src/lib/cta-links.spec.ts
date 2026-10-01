import { describe, expect, it } from "bun:test";
import { withInternalUtm } from "./cta-links";

const attribution = {
  medium: "homepage_hero",
  campaign: "upload_data",
  content: "upload",
};

describe("withInternalUtm", () => {
  it("preserves destination parameters and anchors", () => {
    const href = withInternalUtm(
      "/upload?provider=tinder&view=map#guide",
      attribution,
    );
    const url = new URL(href, "https://www.swipestats.io");
    expect(url.pathname).toBe("/upload");
    expect(url.searchParams.get("provider")).toBe("tinder");
    expect(url.searchParams.get("view")).toBe("map");
    expect(url.hash).toBe("#guide");
    expect(url.searchParams.get("utm_source")).toBe("swipestats");
    expect(url.searchParams.get("utm_medium")).toBe(attribution.medium);
    expect(url.searchParams.get("utm_campaign")).toBe(attribution.campaign);
    expect(url.searchParams.get("utm_content")).toBe(attribution.content);
  });

  it("preserves existing attribution", () => {
    const href = withInternalUtm(
      "/research?utm_source=blog&utm_content=dataset",
      attribution,
    );
    const url = new URL(href, "https://www.swipestats.io");
    expect(url.searchParams.get("utm_source")).toBe("blog");
    expect(url.searchParams.get("utm_content")).toBe("dataset");
    expect(url.searchParams.getAll("utm_source")).toHaveLength(1);
  });

  it("leaves external links and local anchors unchanged", () => {
    for (const href of [
      "https://homi.so",
      "//homi.so",
      "mailto:hello@swipestats.io",
      "#reminder",
    ]) {
      expect(withInternalUtm(href, attribution)).toBe(href);
    }
  });
});
