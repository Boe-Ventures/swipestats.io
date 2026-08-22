import { NextResponse } from "next/server";

import { reviewSwipeRankCohort } from "@/server/services/swipe-rank/ai-review.service";
import { swipeRankSeasonsToPublish } from "@/server/services/swipe-rank/periods";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = swipeRankSeasonsToPublish(new Date()).find(
    (period) => period.kind === "MONTH",
  );
  if (!month) {
    return NextResponse.json(
      { error: "No closed monthly SwipeRank period was found." },
      { status: 500 },
    );
  }
  const result = await reviewSwipeRankCohort({
    period: month,
    limit: 50,
    concurrency: 3,
    actor: "cron:swipe-rank-review",
    includeExcluded: false,
  });
  return NextResponse.json(
    {
      ok: result.failed === 0 && result.requested > 0,
      processedAt: new Date().toISOString(),
      period: month,
      requested: result.requested,
      completed: result.completed,
      failed: result.failed,
      verdictCounts: result.verdictCounts,
      errors: result.errors,
    },
    { status: result.failed === 0 && result.requested > 0 ? 200 : 500 },
  );
}
