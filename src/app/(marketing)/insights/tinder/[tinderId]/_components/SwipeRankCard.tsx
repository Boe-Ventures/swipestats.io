"use client";

// COMMENTED OUT: Will bring back later
// TODO: Re-enable when cohort.getRankings router is available

/*
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Medal, Award } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SwipeRankCardProps {
  profileId: string;
  season: string;
  cohortId?: string;
}

// SwipeRankCard - Display user rankings (PLUS tier)
// Shows rank, percentile, and comparison to benchmarks
export function SwipeRankCard({
  profileId,
  season,
  cohortId,
}: SwipeRankCardProps) {
  const trpc = useTRPC();
  
  const rankingsQuery = useQuery(
    trpc.cohort.getRankings.queryOptions({
      profileId,
      season,
    }),
  );

  if (rankingsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            SwipeRank
          </CardTitle>
          <CardDescription>Your rankings for {season}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rankingsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            SwipeRank
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {rankingsQuery.error.message || "Failed to load rankings"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rankings = rankingsQuery.data || [];

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            SwipeRank
          </CardTitle>
          <CardDescription>Your rankings for {season}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No rankings available for this season yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get the primary metrics to display
  const matchRateRank = rankings.find((r) => r.metric === "MATCH_RATE");
  const matchesTotalRank = rankings.find((r) => r.metric === "MATCHES_TOTAL");
  const conversationsRank = rankings.find((r) => r.metric === "CONVERSATIONS");

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) {
      return { icon: Trophy, color: "bg-yellow-500 text-white", label: `Top ${100 - Math.round(percentile)}%` };
    }
    if (percentile >= 75) {
      return { icon: Medal, color: "bg-blue-500 text-white", label: `Top ${100 - Math.round(percentile)}%` };
    }
    if (percentile >= 50) {
      return { icon: Award, color: "bg-green-500 text-white", label: `Top ${100 - Math.round(percentile)}%` };
    }
    return { icon: TrendingUp, color: "bg-muted text-muted-foreground", label: `Top ${100 - Math.round(percentile)}%` };
  };

  const RankingRow = ({ ranking }: { ranking: typeof rankings[0] }) => {
    const badge = getPercentileBadge(ranking.percentile);
    const BadgeIcon = badge.icon;

    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium capitalize">
            {ranking.metric.replace(/_/g, " ").toLowerCase()}
          </span>
          <Badge className={badge.color}>
            <BadgeIcon className="h-3 w-3 mr-1" />
            {badge.label}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            #{ranking.rank.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            of {ranking.totalInCohort.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          SwipeRank {season}
        </CardTitle>
        <CardDescription>Your rankings in your cohort</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {matchRateRank && <RankingRow ranking={matchRateRank} />}
          {matchesTotalRank && <RankingRow ranking={matchesTotalRank} />}
          {conversationsRank && <RankingRow ranking={conversationsRank} />}
          
          {/* Show all rankings if available - NOTE: comment edited to fix block comment issue STARCOMMENT/}
          {rankings.length > 3 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show all {rankings.length} rankings
              </summary>
              <div className="mt-3 space-y-3">
                {rankings
                  .filter((r) => 
                    r.metric !== "MATCH_RATE" && 
                    r.metric !== "MATCHES_TOTAL" && 
                    r.metric !== "CONVERSATIONS"
                  )
                  .map((ranking) => (
                    <RankingRow key={ranking.id} ranking={ranking} />
                  ))}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
*/

export function SwipeRankCard() {
  return null;
}
