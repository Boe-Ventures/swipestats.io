import Link from "next/link";
import { Ghost } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";

/**
 * Shared chrome for the public `/share/*` pages. These are page-body pieces, so
 * they compose with (don't replace) the per-route `layout.tsx` files that own
 * the OpenGraph metadata.
 */

/**
 * Full-screen "this share no longer exists" fallback. Rendered two ways, and
 * intentionally identical in both: inline by the client share pages (when the
 * tRPC query resolves to nothing) and via the `share/not-found.tsx` route
 * boundary (when a Server Component calls `notFound()`).
 */
export function ShareNotFound({
  title = "This share isn't available",
  description = "The link may have been deleted or is no longer public.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <Ghost className="size-10" />
            </div>
          </div>

          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>

          <p className="text-muted-foreground mt-4 text-lg leading-8">
            {description}
          </p>

          <div className="mt-8 flex items-center justify-center">
            <Link href="https://www.swipestats.io/try?source=share_not_found">
              <Button size="lg" className="bg-rose-600 text-white hover:bg-rose-500">
                Roast your profile 🔥
              </Button>
            </Link>
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            or{" "}
            <Link
              href="https://www.swipestats.io"
              className="font-medium underline-offset-4 hover:underline"
            >
              go to SwipeStats
            </Link>
          </p>
        </div>
      </main>

      <ShareFooter />
    </div>
  );
}

/** "Made with SwipeStats" footer (copy unified across share routes). */
export function ShareFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t py-8", className)}>
      <div className="container mx-auto px-4 text-center">
        <p className="text-muted-foreground text-sm">
          Made with{" "}
          <Link
            href="https://www.swipestats.io"
            className="font-semibold hover:underline"
          >
            SwipeStats
          </Link>
        </p>
      </div>
    </footer>
  );
}
