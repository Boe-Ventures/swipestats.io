import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";

/**
 * Shared chrome for the public `/share/*` pages. These are page-body pieces, so
 * they compose with (don't replace) the per-route `layout.tsx` files that own
 * the OpenGraph metadata.
 */

/** Full-screen "this share no longer exists" fallback. */
export function ShareNotFound({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground mt-2">{description}</p>
        <Link href="https://www.swipestats.io" className="mt-4 inline-block">
          <Button>Go to SwipeStats</Button>
        </Link>
      </div>
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
