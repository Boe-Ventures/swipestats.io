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

// Skeleton for main insights page
export function MainInsightsSkeleton() {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200 sm:h-12 lg:h-14" />
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200 sm:h-6" />
        </div>

        {/* Master Activity Chart */}
        <SkeletonCard height="h-[400px] sm:h-[500px]" />

        {/* Funnel + Side Column */}
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Left: Funnel */}
          <SkeletonCard height="h-[600px]" />

          {/* Right: Stacked Cards */}
          <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
            <SkeletonCard height="h-[200px]" />
            <SkeletonCard height="h-[180px]" />

            {/* Two small cards in a row */}
            <div className="grid w-full grid-cols-2 gap-4 sm:gap-6">
              <SkeletonCard height="h-[160px]" />
              <SkeletonCard height="h-[160px]" />
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <SkeletonCard height="h-[200px]" />

        {/* Messaging Chart */}
        <SkeletonCard height="h-[400px]" />

        {/* Data Request CTA */}
        <SkeletonCard height="h-[150px]" />

        {/* Bottom grid of CTAs */}
        <div className="grid gap-8 lg:grid-cols-2">
          <SkeletonCard height="h-[250px]" />
          <SkeletonCard height="h-[250px]" />
        </div>

        {/* Final CTA */}
        <SkeletonCard height="h-[200px]" />
      </div>
    </main>
  );
}

// Skeleton for compare page
export function CompareInsightsSkeleton() {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-8">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="h-14 w-96 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-6 w-80 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Profile comparison cards */}
        <div className="mb-8 flex justify-center">
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[200px] w-[180px] animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        </div>

        {/* Main charts grid */}
        <div className="grid grid-cols-1 gap-10">
          {/* Full width chart */}
          <SkeletonCard height="h-[400px]" />

          {/* Two column grid */}
          <div className="grid gap-10 md:grid-cols-2">
            <SkeletonCard height="h-[350px]" />
            <SkeletonCard height="h-[350px]" />
          </div>

          {/* Messages Meta + Feedback */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="w-full lg:col-span-2">
              <CardHeader>
                <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-lg bg-gray-200"
                  />
                ))}
              </CardContent>
            </Card>
            <SkeletonCard height="h-[300px]" />
          </div>

          {/* SwipestatsPlus Card */}
          <SkeletonCard height="h-[200px]" />

          {/* Messages grid */}
          <div className="grid gap-10 md:grid-cols-2">
            <SkeletonCard height="h-[350px]" />
            <SkeletonCard height="h-[350px]" />
          </div>

          {/* Directory CTA */}
          <SkeletonCard height="h-[150px]" />

          {/* Swipes grid */}
          <div className="grid gap-10 md:grid-cols-2">
            <SkeletonCard height="h-[350px]" />
            <SkeletonCard height="h-[350px]" />
          </div>

          {/* Data Request CTA */}
          <SkeletonCard height="h-[150px]" />
        </div>
      </div>
    </main>
  );
}
