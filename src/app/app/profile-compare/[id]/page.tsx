"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { ComparisonDetail } from "./comparison-detail";

export default function ComparisonPage() {
  const params = useParams<{ id: string }>();
  const comparisonId = params.id;
  const trpc = useTRPC();

  const { data: comparison, isLoading } = useQuery(
    trpc.profileCompare.get.queryOptions({
      id: comparisonId,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold">Comparison not found</h2>
        <p className="text-muted-foreground mt-2">
          This comparison may have been deleted or you don&apos;t have access to
          it.
        </p>
      </div>
    );
  }

  return <ComparisonDetail comparison={comparison} />;
}
