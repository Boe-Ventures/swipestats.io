import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Base skeleton components
export function SkeletonBox({
  className = "",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <div
      className={`rounded-lg bg-gray-200 ${animated ? "animate-pulse" : ""} ${className}`}
    />
  );
}

export function SkeletonCard({
  className = "",
  height = "h-[300px]",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      </CardHeader>
      <CardContent>
        <div
          className={`w-full animate-pulse rounded-lg bg-gray-200 ${height}`}
        />
      </CardContent>
    </Card>
  );
}

// Skeleton for main Hinge insights page
export function HingeInsightsSkeleton() {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200 sm:h-12 lg:h-14" />
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200 sm:h-6" />
          </div>
          {/* Action buttons skeleton */}
          <div className="flex gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>

        {/* Profile Overview Card */}
        <SkeletonCard height="h-[200px]" />

        {/* Match Timeline */}
        <SkeletonCard height="h-[350px]" />

        {/* Funnel + Conversation Stats */}
        <div className="grid gap-8 lg:grid-cols-2">
          <SkeletonCard height="h-[400px]" />
          <SkeletonCard height="h-[400px]" />
        </div>

        {/* Activity Chart */}
        <SkeletonCard height="h-[400px]" />

        {/* Messages Meta Card */}
        <SkeletonCard height="h-[200px]" />

        {/* Data Request CTA */}
        <SkeletonCard height="h-[150px]" />

        {/* Bottom grid of CTAs */}
        <div className="grid gap-8 lg:grid-cols-2">
          <SkeletonCard height="h-[250px]" />
          <SkeletonCard height="h-[250px]" />
        </div>

        {/* Newsletter CTA */}
        <SkeletonCard height="h-[200px]" />
      </div>
    </main>
  );
}
