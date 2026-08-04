import { describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";

const {
  assertBulkBlobDeletionSucceeded,
  IncompleteBlobDeletionError,
  isTrustedVercelBlobUrl,
} = await import("./blob.service");

describe("Vercel Blob URL trust boundary", () => {
  test("accepts only HTTPS Vercel Blob hosts", () => {
    expect(
      isTrustedVercelBlobUrl(
        "https://store.public.blob.vercel-storage.com/tinder-data/data.json",
      ),
    ).toBeTrue();
    expect(
      isTrustedVercelBlobUrl(
        "http://store.public.blob.vercel-storage.com/tinder-data/data.json",
      ),
    ).toBeFalse();
    expect(
      isTrustedVercelBlobUrl(
        "https://blob.vercel-storage.com.attacker.example/data.json",
      ),
    ).toBeFalse();
    expect(isTrustedVercelBlobUrl("http://127.0.0.1:3000/admin")).toBeFalse();
    expect(isTrustedVercelBlobUrl("not a url")).toBeFalse();
  });
});

describe("bulk blob deletion integrity", () => {
  test("accepts a complete deletion result", () => {
    expect(() =>
      assertBulkBlobDeletionSucceeded({
        success: ["https://store.public.blob.vercel-storage.com/a.json"],
        failed: [],
      }),
    ).not.toThrow();
  });

  test("turns partial success into a retryable error without exposing URLs", () => {
    const privateUrl =
      "https://store.public.blob.vercel-storage.com/tinder-data/private.json";
    let error: unknown;
    try {
      assertBulkBlobDeletionSucceeded({
        success: ["https://store.public.blob.vercel-storage.com/deleted.json"],
        failed: [{ url: privateUrl, error: "storage unavailable" }],
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(IncompleteBlobDeletionError);
    expect(error).toMatchObject({ failedCount: 1, requestedCount: 2 });
    expect((error as Error).message).toContain(
      "Database records were preserved; retry the deletion.",
    );
    expect((error as Error).message).not.toContain(privateUrl);
  });
});
