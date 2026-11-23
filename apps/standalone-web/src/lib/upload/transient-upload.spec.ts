import { expect, it } from "bun:test";
import { ORPCError } from "@orpc/client";
import { shouldReuseTransientUpload } from "./transient-upload";

it("discards rejected upload leases but preserves retries after response loss", () => {
  for (const code of ["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN"] as const) {
    expect(shouldReuseTransientUpload(new ORPCError(code))).toBe(false);
  }
  expect(
    shouldReuseTransientUpload(new ORPCError("INTERNAL_SERVER_ERROR")),
  ).toBe(true);
  expect(shouldReuseTransientUpload(new Error("Failed to fetch"))).toBe(true);
  expect(
    shouldReuseTransientUpload(
      new ORPCError("CONFLICT", { message: "Upload lease has expired" }),
    ),
  ).toBe(false);
});
