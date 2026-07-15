import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { z } from "zod";

import type { HandleUploadBody } from "@vercel/blob/client";
import {
  CLIENT_UPLOAD_PUBLIC_CONFIG,
  resolveClientUploadPolicy,
} from "@/lib/blob-client-upload-policy";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { attachmentTable, RESOURCE_TYPES } from "@/server/db/schema";
import {
  bindTransientUploadFromCallback,
  issueTransientUploadLease,
} from "@/server/services/transient-upload.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Authenticate user
        const session = await getSession();
        if (!session?.user) {
          throw new Error("Unauthorized - please log in to upload files");
        }

        const policy = resolveClientUploadPolicy({
          pathname,
          clientPayload,
          userId: session.user.id,
        });

        if (policy.transientUpload) {
          await issueTransientUploadLease({
            ...policy.transientUpload,
            userId: session.user.id,
            sessionId: session.session.id,
            dataProvider:
              policy.resourceType === "tinder_data" ? "TINDER" : "HINGE",
          });
        }

        console.log("Client upload policy issued", {
          resourceType: policy.resourceType,
          maximumSizeInBytes: policy.maximumSizeInBytes,
        });

        return {
          allowedContentTypes: policy.allowedContentTypes,
          maximumSizeInBytes: policy.maximumSizeInBytes,
          validUntil: policy.validUntil,
          addRandomSuffix: policy.addRandomSuffix,
          tokenPayload: policy.tokenPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // SAFETY NET ONLY. The authoritative attachment row is written
        // client-side by the `blob.createAttachmentFromBlob` mutation, which
        // runs right after the upload resolves and carries the real File
        // metadata (size/filename/mimeType). This webhook exists to recover
        // orphaned blobs — the rare case where the client uploaded but never
        // called the mutation (navigated away / crashed). It is also never
        // delivered to localhost, so it must not be the primary path.
        //
        // The insert is therefore idempotent on the blob URL: `onConflictDoNothing`
        // means we only create a placeholder row if the client mutation hasn't
        // already written the real one — no double-inserts, and the client's
        // good data is never clobbered.
        console.log("Client upload completed");

        try {
          // Parse token payload to get upload context
          const payload = JSON.parse(tokenPayload || "{}") as {
            userId?: string;
            resourceType?: string;
            resourceId?: string;
            uploadId?: string;
          };
          const { userId, resourceType, resourceId } = payload;

          if (
            (resourceType === "tinder_data" || resourceType === "hinge_data") &&
            payload.uploadId
          ) {
            await bindTransientUploadFromCallback({
              id: payload.uploadId,
              blobUrl: blob.url,
              blobPathname: blob.pathname,
            });
            return;
          }

          // Create a fallback attachment record if resource info provided
          if (resourceType && resourceId && userId) {
            // Detect content type from blob metadata
            const contentType = blob.contentType || "application/octet-stream";
            // Vercel blob doesn't provide size here; the client mutation backfills it.
            const size = 0;

            // Validate resource type using schema
            const resourceTypeResult = z
              .enum(RESOURCE_TYPES)
              .safeParse(resourceType);
            if (!resourceTypeResult.success) {
              console.error(`❌ Invalid resource type: ${resourceType}`);
              return; // Skip attachment creation but don't fail upload
            }

            // Idempotent insert — no-op if the client mutation already recorded this URL.
            const [attachment] = await db
              .insert(attachmentTable)
              .values({
                resourceType: resourceTypeResult.data,
                resourceId,
                uploadedBy: userId,
                filename: blob.pathname.split("/").pop() || "unknown",
                originalFilename: blob.pathname.split("/").pop() || "unknown",
                mimeType: contentType,
                size,
                url: blob.url,
                metadata: {
                  blobPathname: blob.pathname,
                  uploadType: "client-webhook-fallback",
                },
              })
              .onConflictDoNothing({ target: attachmentTable.url })
              .returning();

            if (attachment) {
              console.log(
                `🛟 Orphan-recovery attachment created via webhook: ${attachment.id}`,
              );
            } else {
              console.log(
                `↩️ Attachment already recorded by client mutation — webhook no-op`,
              );
            }
          } else {
            console.log(
              `📄 Direct blob upload completed (no attachment record needed)`,
            );
          }
        } catch (error) {
          console.error("❌ Post-upload processing failed:", error);
          // Don't throw here - upload succeeded, just post-processing failed
          // The blob is already stored successfully
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("❌ Client upload handler failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 400 },
    );
  }
}

// Optional: Add a GET endpoint to check upload status or get upload URL
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      resources: CLIENT_UPLOAD_PUBLIC_CONFIG,
    });
  } catch (error) {
    console.error("❌ Get upload config failed:", error);
    return NextResponse.json(
      { error: "Failed to get upload configuration" },
      { status: 500 },
    );
  }
}
