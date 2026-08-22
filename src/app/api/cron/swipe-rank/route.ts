import { NextResponse } from "next/server";

import { publishClosedTinderSwipeRankSeasons } from "@/server/services/swipe-rank/publication.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await publishClosedTinderSwipeRankSeasons();
  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...summary,
  });
}
