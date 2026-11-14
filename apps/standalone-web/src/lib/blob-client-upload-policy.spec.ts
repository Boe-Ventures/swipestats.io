import { describe, expect, test } from "bun:test";
import {
  CLIENT_UPLOAD_LIMITS,
  resolveClientUploadPolicy,
} from "./blob-client-upload-policy";
const PROFILE_ID = "a".repeat(64);
const OTHER_PROFILE_ID = "b".repeat(64);
const UPLOAD_ID = "123e4567-e89b-42d3-a456-426614174000";
function payload(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}
describe("client Blob upload policy", () => {
  test("rejects client attempts to widen types or size", () => {
    expect(() =>
      resolveClientUploadPolicy({
        pathname: `tinder-data/${PROFILE_ID}/${UPLOAD_ID}/data.json`,
        clientPayload: payload({
          resourceType: "tinder_data",
          tinderId: PROFILE_ID,
          uploadId: UPLOAD_ID,
          allowedTypes: ["text/html"],
          maxSize: Number.MAX_SAFE_INTEGER,
        }),
        userId: "anonymous-user",
      }),
    ).toThrow("Upload resource context is invalid");
  });
  test("binds data paths to the declared profile and canonical shape", () => {
    const context = payload({
      resourceType: "tinder_data",
      tinderId: PROFILE_ID,
      uploadId: UPLOAD_ID,
    });
    for (const pathname of [
      `tinder-data/${OTHER_PROFILE_ID}/${UPLOAD_ID}/data.json`,
      `tinder-data/${PROFILE_ID}/00000000-0000-4000-8000-000000000000/data.json`,
      `tinder-data/${PROFILE_ID}/${UPLOAD_ID}/note.html`,
      `tinder-data/${PROFILE_ID}/${UPLOAD_ID}/nested/data.json`,
      `../tinder-data/${PROFILE_ID}/${UPLOAD_ID}/data.json`,
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
});
