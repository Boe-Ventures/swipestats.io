import { NextResponse } from "next/server";

import { cleanupTransientUploadsBatch } from "@/server/services/transient-upload.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await cleanupTransientUploadsBatch({ limit: 50 });
  return NextResponse.json({
    ok: summary.failed === 0,
    cleanedAt: new Date().toISOString(),
    ...summary,
  });
}
