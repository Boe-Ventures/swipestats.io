import { describe, expect, it } from "bun:test";

import {
  isBlobPathForTransientLease,
  transientUploadCleanupPrefix,
} from "@/lib/upload/transient-upload";

describe("transient provider upload path binding", () => {
  const expected =
    "tinder-data/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/123e4567-e89b-42d3-a456-426614174000/data.json";

  it("accepts only Vercel's randomized JSON filename in the lease directory", () => {
    expect(isBlobPathForTransientLease(expected, expected)).toBe(true);
    expect(
      isBlobPathForTransientLease(
        expected,
        expected.replace("data.json", "data-aB_91-z.json"),
      ),
    ).toBe(true);
    expect(
      isBlobPathForTransientLease(
        expected,
        expected.replace("data.json", "nested/data-aB91.json"),
      ),
    ).toBe(false);
    expect(
      isBlobPathForTransientLease(
        expected,
        expected.replace("data.json", "payload.html"),
      ),
    ).toBe(false);
  });

  it("derives a cleanup prefix unique to one lease", () => {
    expect(transientUploadCleanupPrefix(expected)).toBe(
      expected.replace("data.json", ""),
    );
  });
});
