import { describe, expect, it } from "bun:test";
import { normalizeGeneratedCopy } from "./copy-style";

const dash = String.fromCodePoint(0x2014);

describe("generated copy punctuation", () => {
  it("cleans nested copy without mutating stored results or content references", () => {
    const source = {
      headline: `Nice photos${dash}try a clearer lead`,
      photos: [
        { contentId: `photo${dash}id`, body: `Good light ${dash} keep it` },
      ],
      realTalk: [null, 3, true, { detail: `Try this${dash}then compare` }],
    };
    const clean = normalizeGeneratedCopy(source);
    expect(clean.headline).toBe("Nice photos - try a clearer lead");
    expect(clean.photos[0]?.body).toBe("Good light - keep it");
    expect(clean.photos[0]?.contentId).toBe(source.photos[0]?.contentId);
    expect(clean.realTalk).toEqual([
      null,
      3,
      true,
      { detail: "Try this - then compare" },
    ]);
    expect(source.headline).toContain(dash);
  });
});
