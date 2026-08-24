import { describe, expect, test } from "bun:test";

import {
  appendVary,
  markdownResponse,
  negotiatePageRepresentation,
} from "./content-negotiation";

describe("homepage content negotiation", () => {
  test("defaults browser and wildcard requests to HTML", () => {
    expect(negotiatePageRepresentation(null)).toBe("text/html");
    expect(negotiatePageRepresentation("*/*")).toBe("text/html");
  });

  test("honors client order and quality values", () => {
    expect(negotiatePageRepresentation("text/markdown, text/html;q=0.8")).toBe(
      "text/markdown",
    );
    expect(
      negotiatePageRepresentation("text/markdown;q=0.4, text/html;q=0.9"),
    ).toBe("text/html");
  });

  test("lets a specific rejection override a wildcard", () => {
    expect(
      negotiatePageRepresentation("text/markdown;q=0, text/html;q=0, */*;q=1"),
    ).toBeNull();
  });

  test("returns no representation for an unsupported media type", () => {
    expect(negotiatePageRepresentation("application/pdf")).toBeNull();
  });

  test("adds Accept to an existing Vary header once", () => {
    const headers = new Headers({ Vary: "Accept-Encoding" });
    appendVary(headers, "Accept");
    appendVary(headers, "accept");
    expect(headers.get("Vary")).toBe("Accept-Encoding, Accept");
  });

  test("serves Markdown directly with a cache-safe Vary header", () => {
    const response = markdownResponse("# SwipeStats\n");
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Vary")).toBe("Accept, Accept-Encoding");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});
