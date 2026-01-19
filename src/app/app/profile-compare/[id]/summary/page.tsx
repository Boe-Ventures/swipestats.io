"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { SummaryTab } from "../summary-tab";

export default function SummaryPage() {
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
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold">Comparison not found</h2>
        <p className="text-muted-foreground mt-2">
          This comparison may have been deleted or you don't have access to it.
        </p>
      </div>
    );
  }

  return <SummaryTab comparisonId={comparison.id} />;
}
