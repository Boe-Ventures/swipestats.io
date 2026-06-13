import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dashboard2Client } from "./Dashboard2Client";

/**
 * Dashboard alternative 2 — "insight-led".
 *
 * Leads with a computed headline (match rate + cohort standing) instead of a
 * welcome banner, follows with a next-best-action strip, and demotes the app
 * cards to compact rows. Prototype for comparison against /app/dashboard.
 */
export default function Dashboard2Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      }
    >
      <Dashboard2Client />
    </Suspense>
  );
}
