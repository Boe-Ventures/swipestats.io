import type { Metadata } from "next";

import { SwipeRankLeaderboard } from "./SwipeRankLeaderboard";

export const metadata: Metadata = {
  title: "SwipeRank Leaderboard",
  description:
    "Explore pseudonymous Tinder observed-match-rate rankings by month, quarter, year, and all time.",
};

export default function SwipeRankLeaderboardPage() {
  return <SwipeRankLeaderboard />;
}
