import { revalidateTag } from "next/cache";

export const SWIPE_RANK_PUBLIC_CACHE_TAG = "swipe-rank-public-v2";

/**
 * Runtime mutations invalidate immediately. Fact recomputes also run from
 * standalone scripts, so cache invalidation cannot be allowed to turn a
 * successful database build into a reported failure there.
 */
export function invalidatePublicSwipeRankCache(): boolean {
  try {
    revalidateTag(SWIPE_RANK_PUBLIC_CACHE_TAG, { expire: 0 });
    return true;
  } catch (error) {
    console.warn("[SwipeRank] Could not invalidate the public cache", error);
    return false;
  }
}
