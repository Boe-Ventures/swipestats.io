import { ShareNotFound } from "@/components/share/share-shell";

/**
 * Route boundary for every `/share/*` page. Server Components that call
 * `notFound()` (e.g. the stats-roast share page) render this instead of the
 * generic global `app/not-found.tsx`, so a dead/unpublished share link always
 * lands on the same branded "not available" screen the client share pages show
 * inline via <ShareNotFound />.
 */
export default function ShareNotFoundPage() {
  return <ShareNotFound />;
}
