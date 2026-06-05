import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { z } from "zod";

import type { HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/server/better-auth/server";
import { RESOURCE_TYPES } from "@/server/db/schema";
import { ALLOWED_FILE_TYPES } from "@/server/services/blob.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Authenticate user
        const session = await getSession();
        if (!session?.user) {
          throw new Error("Unauthorized - please log in to upload files");
        }

        console.log(`🔐 Generating upload token for: ${pathname}`);
        console.log(`👤 User: ${session.user.id}`);
        console.log(`📦 Client payload:`, clientPayload);

        // Parse and validate client payload
        const uploadContextSchema = z.object({
          resourceType: z.enum(RESOURCE_TYPES).optional(),
          resourceId: z.string().optional(),
          allowedTypes: z.array(z.string()).optional(),
          maxSize: z.number().optional(),
        });

        let uploadContext = uploadContextSchema.parse({});

        if (clientPayload) {
          try {
            uploadContext = uploadContextSchema.parse(
              JSON.parse(clientPayload),
            );
          } catch (error) {
            console.warn("⚠️ Failed to parse client payload:", error);
          }
        }

        // Determine allowed content types based on context
        let allowedContentTypes: string[] = [
          ...ALLOWED_FILE_TYPES.IMAGE,
          ...ALLOWED_FILE_TYPES.VIDEO,
          ...ALLOWED_FILE_TYPES.AUDIO,
        ];

        // Override allowed types if specified in context
        if (
          uploadContext.allowedTypes &&
          uploadContext.allowedTypes.length > 0
        ) {
          allowedContentTypes = uploadContext.allowedTypes;
        } else if (uploadContext.resourceType) {
          // Set default allowed types based on resource type
          switch (uploadContext.resourceType) {
            case "profile_comparison":
            case "comparison_column":
            case "user_photo":
              // For profile photos, allow images and video
              allowedContentTypes = [
                ...ALLOWED_FILE_TYPES.IMAGE,
                ...ALLOWED_FILE_TYPES.VIDEO,
                ...ALLOWED_FILE_TYPES.AUDIO,
              ];
              break;
            case "tinder_data":
            case "hinge_data":
              // For data exports, allow JSON files
              allowedContentTypes = ["application/json"];
              break;
            default:
              // Keep default broad allowlist
              break;
          }
        }

        console.log(`✅ Allowed content types:`, allowedContentTypes);

        return {
          allowedContentTypes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            userEmail: session.user.email,
            uploadedAt: new Date().toISOString(),
            ...uploadContext,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Observability only — DO NOT create attachment rows here.
        //
        // Attachments are created client-side via the
        // `blob.createAttachmentFromBlob` mutation, which is idempotent on the
        // blob URL and carries real metadata (size/filename). That keeps
        // dev/prod parity, since this webhook is never delivered to localhost.
        // Creating rows here too would double-insert in production (and write a
        // worse row, with size = 0). The unique index on attachment.url is the
        // backstop if this is ever re-enabled as a safety net.
        console.log(`✅ Client upload completed:`, blob.url);
        console.log(`📦 Token payload:`, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("❌ Client upload handler failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
        details: error instanceof Error ? error.stack : undefined,
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

    // Return upload configuration/limits for the frontend
    return NextResponse.json({
      maxFileSize: 100 * 1024 * 1024, // 100MB for client uploads
      allowedTypes: {
        images: ALLOWED_FILE_TYPES.IMAGE,
        videos: ALLOWED_FILE_TYPES.VIDEO,
        audio: ALLOWED_FILE_TYPES.AUDIO,
      },
      userId: session.user.id,
    });
  } catch (error) {
    console.error("❌ Get upload config failed:", error);
    return NextResponse.json(
      { error: "Failed to get upload configuration" },
      { status: 500 },
    );
  }
}
