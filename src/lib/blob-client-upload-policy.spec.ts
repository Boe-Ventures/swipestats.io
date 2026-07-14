import { describe, expect, test } from "bun:test";

import {
  CLIENT_UPLOAD_LIMITS,
  resolveClientUploadPolicy,
} from "./blob-client-upload-policy";
import {
  resourceBlobPath,
  safeBlobFilename,
  userPhotoPath,
} from "./blob-paths";

const PROFILE_ID = "a".repeat(64);
const OTHER_PROFILE_ID = "b".repeat(64);
const NOW = Date.UTC(2026, 6, 14, 12);

function payload(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

describe("client Blob upload policy", () => {
  test("gives data exports a server-owned JSON-only 200 MiB policy", () => {
    const policy = resolveClientUploadPolicy({
      pathname: `tinder-data/${PROFILE_ID}/2026-07-14/data.json`,
      clientPayload: payload({
        resourceType: "tinder_data",
        tinderId: PROFILE_ID,
      }),
      userId: "anonymous-user",
      now: NOW,
    });

    expect(policy.allowedContentTypes).toEqual(["application/json"]);
    expect(policy.maximumSizeInBytes).toBe(
      CLIENT_UPLOAD_LIMITS.dataExportBytes,
    );
    expect(policy.validUntil).toBe(NOW + CLIENT_UPLOAD_LIMITS.tokenTtlMs);
    expect(policy.addRandomSuffix).toBeTrue();
    expect(JSON.parse(policy.tokenPayload)).toEqual({
      userId: "anonymous-user",
      resourceType: "tinder_data",
    });
  });

  test("accepts the equivalent Hinge and Raya export path contracts", () => {
    expect(
      resolveClientUploadPolicy({
        pathname: `hinge-data/${PROFILE_ID}/2026-07-14/data.json`,
        clientPayload: payload({
          resourceType: "hinge_data",
          hingeId: PROFILE_ID,
        }),
        userId: "anonymous-user",
      }).resourceType,
    ).toBe("hinge_data");

    expect(
      resolveClientUploadPolicy({
        pathname: `raya-data/${PROFILE_ID}/2026-07-14/data.json`,
        clientPayload: payload({
          resourceType: "raya_data",
          rayaId: PROFILE_ID,
        }),
        userId: "anonymous-user",
      }).resourceType,
    ).toBe("raya_data");
  });

  test("rejects client attempts to widen types or size", () => {
    expect(() =>
      resolveClientUploadPolicy({
        pathname: `tinder-data/${PROFILE_ID}/2026-07-14/data.json`,
        clientPayload: payload({
          resourceType: "tinder_data",
          tinderId: PROFILE_ID,
          allowedTypes: ["text/html"],
          maxSize: Number.MAX_SAFE_INTEGER,
        }),
        userId: "anonymous-user",
      }),
    ).toThrow("Upload resource context is invalid");
  });

  test("requires a known resource context", () => {
    expect(() =>
      resolveClientUploadPolicy({
        pathname: "anything",
        clientPayload: null,
        userId: "anonymous-user",
      }),
    ).toThrow("Upload resource context is required");

    expect(() =>
      resolveClientUploadPolicy({
        pathname: "anything",
        clientPayload: payload({ resourceType: "arbitrary_upload" }),
        userId: "anonymous-user",
      }),
    ).toThrow("Upload resource context is invalid");

    expect(() =>
      resolveClientUploadPolicy({
        pathname: "anything",
        clientPayload: " ".repeat(2_049),
        userId: "anonymous-user",
      }),
    ).toThrow("Upload resource context is invalid");
  });

  test("binds data paths to the declared profile and canonical shape", () => {
    const context = payload({
      resourceType: "tinder_data",
      tinderId: PROFILE_ID,
    });

    for (const pathname of [
      `tinder-data/${OTHER_PROFILE_ID}/2026-07-14/data.json`,
      `tinder-data/${PROFILE_ID}/2026-02-31/data.json`,
      `tinder-data/${PROFILE_ID}/2026-07-14/note.html`,
      `tinder-data/${PROFILE_ID}/2026-07-14/nested/data.json`,
      `../tinder-data/${PROFILE_ID}/2026-07-14/data.json`,
    ]) {
      expect(() =>
        resolveClientUploadPolicy({
          pathname,
          clientPayload: context,
          userId: "anonymous-user",
        }),
      ).toThrow("Upload pathname is invalid");
    }
  });

  test("binds gallery uploads to the authenticated user's namespace", () => {
    const policy = resolveClientUploadPolicy({
      pathname: "user-photos/user_123/My-photo.jpg",
      clientPayload: payload({
        resourceType: "user_photo",
        resourceId: "gallery",
      }),
      userId: "user_123",
    });

    expect(policy.allowedContentTypes).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
    expect(policy.maximumSizeInBytes).toBe(CLIENT_UPLOAD_LIMITS.imageBytes);
    expect(JSON.parse(policy.tokenPayload)).toEqual({
      userId: "user_123",
      resourceType: "user_photo",
      resourceId: "gallery",
    });

    expect(() =>
      resolveClientUploadPolicy({
        pathname: "user-photos/another-user/My-photo.jpg",
        clientPayload: payload({
          resourceType: "user_photo",
          resourceId: "gallery",
        }),
        userId: "user_123",
      }),
    ).toThrow("Upload pathname is invalid");
  });

  test("rejects resource types without an ownership policy", () => {
    expect(() =>
      resolveClientUploadPolicy({
        pathname: "profile_comparison/pcmp_123/photo.webp",
        clientPayload: payload({
          resourceType: "profile_comparison",
          resourceId: "pcmp_123",
        }),
        userId: "user_123",
      }),
    ).toThrow("Upload resource context is invalid");
  });
});

describe("Blob pathname builders", () => {
  test("turns local filenames into one bounded safe segment", () => {
    expect(safeBlobFilename("../../My summer photo (1).JPG")).toBe(
      "My-summer-photo-1.JPG",
    );
    expect(safeBlobFilename("..\\..\\✨.png")).toBe("png");
    expect(safeBlobFilename(".")).toBe("upload");
    expect(safeBlobFilename(`${"a".repeat(200)}.jpeg`).length).toBe(120);
  });

  test("uses sanitized filenames in every client media path", () => {
    expect(userPhotoPath("user_123", "summer trip.jpg")).toBe(
      "user-photos/user_123/summer-trip.jpg",
    );
    expect(
      resourceBlobPath("comparison_column", "column_123", "../face.png"),
    ).toBe("comparison_column/column_123/face.png");
  });
});
