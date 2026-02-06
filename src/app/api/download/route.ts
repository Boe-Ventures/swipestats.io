import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { datasetExportTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 },
      );
    }

    // Get the export record
    const exportRecord = await db.query.datasetExportTable.findFirst({
      where: eq(datasetExportTable.licenseKey, licenseKey),
    });

    if (!exportRecord) {
      return NextResponse.json(
        { error: "Export not found for this license key" },
        { status: 404 },
      );
    }

    // Check if dataset is ready
    if (exportRecord.status !== "READY") {
      return NextResponse.json(
        { error: `Dataset is not ready yet. Status: ${exportRecord.status}` },
        { status: 412 },
      );
    }

    // Check download limit
    if (exportRecord.downloadCount >= exportRecord.maxDownloads) {
      return NextResponse.json(
        { error: "Download limit reached for this license key" },
        { status: 403 },
      );
    }

    // Check if expired
    if (exportRecord.expiresAt && exportRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This license key has expired" },
        { status: 403 },
      );
    }

    if (!exportRecord.blobUrl) {
      return NextResponse.json(
        { error: "Download URL not available" },
        { status: 500 },
      );
    }

    // Fetch the file from Vercel Blob
    const blobResponse = await fetch(exportRecord.blobUrl);

    if (!blobResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch dataset file" },
        { status: 500 },
      );
    }

    // Increment download count
    const now = new Date();
    await db
      .update(datasetExportTable)
      .set({
        downloadCount: exportRecord.downloadCount + 1,
        firstDownloadedAt: exportRecord.firstDownloadedAt ?? now,
        lastDownloadedAt: now,
      })
      .where(eq(datasetExportTable.id, exportRecord.id));

    // Get the blob content
    const blob = await blobResponse.blob();

    // Generate filename
    const filename = `swipestats-dataset-${exportRecord.tier.toLowerCase()}.json`;

    // Return with Content-Disposition header to force download
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": blob.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download file",
      },
      { status: 500 },
    );
  }
}
