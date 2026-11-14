import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-12">
          <div className="space-y-4">
            <Skeleton className="h-12 w-96" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
