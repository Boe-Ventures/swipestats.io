import { describe, expect, it } from "bun:test";

import {
  RETRYABLE_UPLOAD_CLEANUP_PREFIX,
  shouldReuseTransientUpload,
} from "./transient-upload";

describe("transient upload retry policy", () => {
  it("retains the exact lease for server, network, and response-loss retries", () => {
    expect(shouldReuseTransientUpload({ data: { code: "CONFLICT" } })).toBe(
      true,
    );
    expect(
      shouldReuseTransientUpload({
        data: { code: "INTERNAL_SERVER_ERROR" },
      }),
    ).toBe(true);
    expect(shouldReuseTransientUpload({ message: "Failed to fetch" })).toBe(
      true,
    );
    expect(
      shouldReuseTransientUpload({
        message: `${RETRYABLE_UPLOAD_CLEANUP_PREFIX}: retry`,
      }),
    ).toBe(true);
  });

  it("discards leases that cannot become valid on retry", () => {
    expect(shouldReuseTransientUpload({ data: { code: "BAD_REQUEST" } })).toBe(
      false,
    );
    expect(shouldReuseTransientUpload({ data: { code: "FORBIDDEN" } })).toBe(
      false,
    );
    expect(
      shouldReuseTransientUpload({
        message: "Temporary upload lease has expired.",
      }),
    ).toBe(false);
  });
});
