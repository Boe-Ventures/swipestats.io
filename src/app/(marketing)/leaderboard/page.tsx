import type { Metadata } from "next";

import { SwipeRankLeaderboard } from "./SwipeRankLeaderboard";

export const metadata: Metadata = {
  title: "SwipeRank Leaderboard",
  description:
    "Explore pseudonymous Tinder observed-match-rate rankings from completed month, quarter, and year seasons.",
};

export default function SwipeRankLeaderboardPage() {
  return <SwipeRankLeaderboard />;
}
