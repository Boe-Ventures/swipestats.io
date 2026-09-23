import { type NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { datasetExportTable } from "@/server/db/schema";
import { validateDatasetLicenseKey } from "@/server/services/lemonSqueezy.service";
import { readResearchBlob } from "@/server/services/research-storage";
import {
  researchDownloadFormat,
  DOWNLOAD_ACK_COOKIE,
  DOWNLOAD_COOKIE_PATH,
} from "@/lib/research/download-format";
import { isExportExpired } from "@/lib/research/access-policy";
import { trackServerEvent } from "@/server/services/analytics.service";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}

// License credentials belong in the POST body, never a URL or redirect.
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const licenseKey = form.get("licenseKey");
    if (
      typeof licenseKey !== "string" ||
      !licenseKey.trim() ||
      licenseKey.length > 512
    )
      return failure("License key is required", 400);
    const requestId = form.get("requestId");
    if (
      requestId !== null &&
      (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId))
    )
      return failure("Invalid download request", 400);
    const validation = await validateDatasetLicenseKey(licenseKey);
    if (!validation.valid)
      return failure(
        "This dataset license is invalid or no longer active",
        403,
      );
    const record = await db.query.datasetExportTable.findFirst({
      where: eq(datasetExportTable.licenseKey, licenseKey),
    });
    if (!record) return failure("Export not found for this license key", 404);
    if (validation.tier !== record.tier || isExportExpired(record.expiresAt))
      return failure("This dataset license is invalid or has expired", 403);
    if (record.status !== "READY" || !record.blobUrl)
      return failure("Dataset is not ready yet", 412);
    if (record.downloadCount >= record.maxDownloads)
      return failure("Download limit reached for this license key", 403);

    const format = researchDownloadFormat(record.blobUrl);
    const file = await readResearchBlob(record.blobUrl);
    if (file?.statusCode !== 200)
      return failure("Dataset file is unavailable", 503);
    // Reserve the download atomically. Concurrent requests cannot bypass the limit.
    const now = new Date();
    const [claimed] = await db
      .update(datasetExportTable)
      .set({
        downloadCount: sql`${datasetExportTable.downloadCount} + 1`,
        firstDownloadedAt: sql`coalesce(${datasetExportTable.firstDownloadedAt}, ${now})`,
        lastDownloadedAt: now,
      })
      .where(
        and(
          eq(datasetExportTable.id, record.id),
          eq(datasetExportTable.status, "READY"),
          eq(datasetExportTable.blobUrl, record.blobUrl),
          lt(datasetExportTable.downloadCount, datasetExportTable.maxDownloads),
          or(
            isNull(datasetExportTable.expiresAt),
            gt(datasetExportTable.expiresAt, now),
          ),
        ),
      )
      .returning({ downloadCount: datasetExportTable.downloadCount });
    if (!claimed) {
      await file.stream.cancel();
      return failure("Download is no longer available for this license", 403);
    }
    trackServerEvent(`dataset_export:${record.id}`, "dataset_downloaded", {
      exportId: record.id,
      orderId: record.orderId ?? null,
      tier: record.tier,
      profileCount: record.profileCount,
      downloadCount: claimed.downloadCount,
      downloadsRemaining: Math.max(
        0,
        record.maxDownloads - claimed.downloadCount,
      ),
      maxDownloads: record.maxDownloads,
    });
    const response = new NextResponse(file.stream, {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": format.contentType,
        "Content-Disposition": `attachment; filename="swipestats-dataset-${record.tier.toLowerCase()}.${format.extension}"`,
        ...(file.blob.size === undefined
          ? {}
          : { "Content-Length": String(file.blob.size) }),
      },
    });
    if (requestId)
      response.cookies.set(`${DOWNLOAD_ACK_COOKIE}_${requestId}`, "1", {
        path: DOWNLOAD_COOKIE_PATH,
        maxAge: 60,
        sameSite: "strict",
        secure: request.nextUrl.protocol === "https:",
      });
    return response;
  } catch {
    // Provider errors can contain storage URLs and credentials.
    return failure(
      "Unable to download this dataset. Please contact kris@swipestats.io.",
      503,
    );
  }
}
