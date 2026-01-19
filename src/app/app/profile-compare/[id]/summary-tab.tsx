"use client";

import { BarChart3, Image as ImageIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { PhotoSummaryItem } from "./photo-summary-item";

interface SummaryTabProps {
  comparisonId: string;
}

export function SummaryTab({ comparisonId }: SummaryTabProps) {
  const trpc = useTRPC();
  const { data: photos, isLoading } = useQuery(
    trpc.profileCompare.getPhotoSummary.queryOptions({
      comparisonId,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="bg-muted mb-4 rounded-full p-4">
            <BarChart3 className="text-muted-foreground h-8 w-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No photos to rank</h3>
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            Add photos to your columns to see them ranked here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Photo Rankings</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Photos ranked by position, frequency, and ratings across all columns
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </Badge>
      </div>

      {/* Ranked Photos List */}
      <div className="space-y-3">
        {photos.map((photo) => (
          <PhotoSummaryItem key={photo.attachmentId} photo={photo} />
        ))}
      </div>
    </div>
  );
}
