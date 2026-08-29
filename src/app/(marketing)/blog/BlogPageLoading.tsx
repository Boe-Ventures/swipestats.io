function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-full bg-gray-200/80 ${className}`} />;
}

function FeaturedSkeleton({ primary = false }: { primary?: boolean }) {
  return (
    <div
      className={`relative isolate flex overflow-hidden rounded-xl bg-linear-to-br from-rose-100 via-pink-50 to-indigo-100 shadow-sm ${
        primary ? "min-h-96 lg:row-span-2" : "min-h-72 lg:min-h-0"
      }`}
    >
      <div className="absolute -top-16 -right-12 size-52 rounded-full bg-white/60 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="mt-auto w-full space-y-4 bg-linear-to-t from-gray-950/80 via-gray-900/45 to-transparent p-6 pt-28 lg:p-8">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-white/30" />
          <div className="h-6 w-24 rounded-full bg-white/20" />
        </div>
        <SkeletonLine
          className={
            primary ? "h-8 w-4/5 bg-white/70" : "h-6 w-3/4 bg-white/70"
          }
        />
        <SkeletonLine className="h-4 w-full bg-white/35" />
        <div className="flex items-center gap-3 pt-1">
          <div className="size-9 rounded-full bg-white/40" />
          <SkeletonLine className="h-4 w-24 bg-white/40" />
        </div>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="aspect-3/2 bg-linear-to-br from-gray-100 via-rose-50 to-indigo-50" />
      <div className="space-y-4 p-5">
        <div className="h-6 w-20 rounded-md bg-rose-200/80" />
        <SkeletonLine className="h-5 w-5/6" />
        <div className="space-y-2">
          <SkeletonLine className="h-3.5 w-full" />
          <SkeletonLine className="h-3.5 w-3/4" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <div className="size-8 rounded-full bg-gray-200" />
          <SkeletonLine className="h-3.5 w-24" />
          <SkeletonLine className="h-3.5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function BlogPageLoading() {
  return (
    <main
      className="bg-background min-h-screen"
      aria-busy="true"
      aria-label="Loading blog posts"
    >
      <span className="sr-only" role="status">
        Loading blog posts
      </span>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
        <div className="space-y-6 border-b border-gray-200 pb-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Featured Posts
            </h2>
            <p className="text-muted-foreground mt-1">
              Our most popular and impactful content
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 motion-safe:animate-pulse lg:grid-cols-2">
            <FeaturedSkeleton primary />
            <FeaturedSkeleton />
            <FeaturedSkeleton />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Posts</h2>
            <p className="text-muted-foreground mt-1">
              Browse our complete collection of articles and guides
            </p>
          </div>
          <div className="space-y-4 motion-safe:animate-pulse">
            <div className="h-12 rounded-lg border border-gray-200 bg-white shadow-sm" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-lg bg-gray-100" />
              <div className="h-8 w-24 rounded-lg bg-gray-100" />
              <div className="h-8 w-28 rounded-lg bg-gray-100" />
            </div>
            <div className="border-t border-gray-200 pt-4">
              <SkeletonLine className="h-4 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 motion-safe:animate-pulse lg:grid-cols-3">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
