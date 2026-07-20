import { NextResponse } from "next/server";

import { reconcileTinderSwipeRankFacts } from "@/server/services/swipe-rank/reconcile.service";
import { invalidatePublicSwipeRankCache } from "@/server/services/swipe-rank/public-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await reconcileTinderSwipeRankFacts({ limit: 100 });
  if (summary.orphanProfilesPurged > 0 || summary.build) {
    invalidatePublicSwipeRankCache();
  }
  return NextResponse.json({
    ok: true,
    reconciledAt: new Date().toISOString(),
    ...summary,
  });
}
