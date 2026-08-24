import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { appendVary, negotiatePageRepresentation } from "./content-negotiation";

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

  test("keeps the negotiated homepage variants separate at the CDN", () => {
    const config = JSON.parse(
      readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
    ) as {
      headers: { headers: { key: string; value: string }[]; source: string }[];
    };
    const homepage = config.headers.find((entry) => entry.source === "/");
    expect(homepage?.headers).toContainEqual({
      key: "Vary",
      value: "Accept, Accept-Encoding",
    });
  });
});
