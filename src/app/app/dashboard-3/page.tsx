import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dashboard3Client } from "./Dashboard3Client";

/**
 * Dashboard alternative 3 — "the honest hub".
 *
 * Accepts that the dashboard is a launcher and makes it a great one: no hero,
 * no marketing furniture — compact app tiles, your comparisons, the roast
 * teaser, and the photo library, all one click away. Prototype for comparison
 * against /app/dashboard.
 */
export default function Dashboard3Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <Dashboard3Client />
    </Suspense>
  );
}
