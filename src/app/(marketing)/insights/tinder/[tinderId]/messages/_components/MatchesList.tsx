"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useMessages } from "../MessagesProvider";
import { MatchCard } from "./MatchCard";
import type { Match } from "@/server/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

type SortOption = "messages" | "date" | "recent-activity";

type MatchesByYear = {
  year: number;
  matches: Match[];
};

/**
 * Interpolate year for a match without a date based on surrounding matches
 */
function interpolateYear(
  targetOrder: number,
  orderToYear: Map<number, number>,
): number {
  // Find the closest match before and after with known years
  let beforeOrder = -1;
  let beforeYear = 0;
  let afterOrder = Number.MAX_SAFE_INTEGER;
  let afterYear = 0;

  for (const [order, year] of orderToYear.entries()) {
    if (order < targetOrder && order > beforeOrder) {
      beforeOrder = order;
      beforeYear = year;
    }
    if (order > targetOrder && order < afterOrder) {
      afterOrder = order;
      afterYear = year;
    }
  }

  // If we have both before and after, use the one that's closer
  if (beforeOrder !== -1 && afterOrder !== Number.MAX_SAFE_INTEGER) {
    const distanceBefore = targetOrder - beforeOrder;
    const distanceAfter = afterOrder - targetOrder;
    return distanceBefore <= distanceAfter ? beforeYear : afterYear;
  }

  // If only before, use that
  if (beforeOrder !== -1) {
    return beforeYear;
  }

  // If only after, use that
  if (afterOrder !== Number.MAX_SAFE_INTEGER) {
    return afterYear;
  }

  // No dates at all - shouldn't happen but fallback to 0
  return 0;
}

export function MatchesList() {
  const { matches } = useMessages();
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const hasInitializedRef = useRef(false);

  // Sort and group matches by year with interpolation for orphaned matches
  const matchesByYear = useMemo(() => {
    // First, sort all matches by order (chronological)
    const matchesCopy = [...matches].sort((a, b) => a.order - b.order);

    // Build a map: order -> year (from matches that have dates)
    const orderToYear = new Map<number, number>();
    matchesCopy.forEach((match) => {
      if (match.initialMessageAt) {
        const year = match.initialMessageAt.getFullYear();
        orderToYear.set(match.order, year);
      }
    });

    // Interpolate years for matches without dates
    const matchesWithYears = matchesCopy.map((match) => {
      let year: number;

      if (match.initialMessageAt) {
        // Has date - use it directly
        year = match.initialMessageAt.getFullYear();
      } else {
        // No date - interpolate based on surrounding matches
        year = interpolateYear(match.order, orderToYear);
      }

      return { match, year };
    });

    // Now apply the user's selected sort
    switch (sortBy) {
      case "messages":
        matchesWithYears.sort(
          (a, b) => b.match.totalMessageCount - a.match.totalMessageCount,
        );
        break;
      case "date":
        // Already sorted by order (chronological), reverse for newest first
        matchesWithYears.reverse();
        break;
      case "recent-activity":
        matchesWithYears.sort((a, b) => {
          const dateA =
            a.match.lastMessageAt?.getTime() ||
            a.match.initialMessageAt?.getTime() ||
            0;
          const dateB =
            b.match.lastMessageAt?.getTime() ||
            b.match.initialMessageAt?.getTime() ||
            0;
          return dateB - dateA;
        });
        break;
    }

    // Group by year
    const yearGroups = new Map<number, Match[]>();
    matchesWithYears.forEach(({ match, year }) => {
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year)!.push(match);
    });

    // Convert to array and sort years descending (newest first)
    const result: MatchesByYear[] = Array.from(yearGroups.entries())
      .map(([year, matches]) => ({ year, matches }))
      .sort((a, b) => b.year - a.year);

    return result;
  }, [matches, sortBy]);

  // Auto-expand most recent year and oldest year on first render
  useEffect(() => {
    if (matchesByYear.length > 0 && !hasInitializedRef.current) {
      const yearsToExpand = new Set<number>();

      // Expand the first year (newest)
      if (matchesByYear[0]) {
        yearsToExpand.add(matchesByYear[0].year);
      }

      // Expand the last year (oldest - where it all began!)
      const lastYear = matchesByYear[matchesByYear.length - 1];
      if (matchesByYear.length > 1 && lastYear) {
        yearsToExpand.add(lastYear.year);
      }

      setExpandedYears(yearsToExpand);
      hasInitializedRef.current = true;
    }
  }, [matchesByYear]);

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Matches Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No matches found for this profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sort Controls */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">All Matches ({matches.length})</h2>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Sort by:</span>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="messages">Most Messages</SelectItem>
              <SelectItem value="date">Match Date (Newest)</SelectItem>
              <SelectItem value="recent-activity">Recent Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matches Grouped by Year */}
      <div className="space-y-4">
        {matchesByYear.map((yearGroup, groupIndex) => {
          const isExpanded = expandedYears.has(yearGroup.year);

          return (
            <div key={yearGroup.year} className="space-y-4">
              {/* Year Header - Clickable */}
              <button
                onClick={() => toggleYear(yearGroup.year)}
                className="bg-background/95 supports-[backdrop-filter]:bg-background/60 hover:bg-muted/50 sticky top-0 z-10 -mx-4 w-full border-b px-4 pt-2 pb-3 backdrop-blur transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <ChevronRight className="text-muted-foreground h-5 w-5" />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold">
                      {yearGroup.year === 0 ? "Unknown Date" : yearGroup.year}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {yearGroup.matches.length} match
                      {yearGroup.matches.length !== 1 ? "es" : ""}
                    </p>
                  </div>
                </div>
              </button>

              {/* Matches in this year - Collapsible */}
              {isExpanded && (
                <div className="space-y-4">
                  {yearGroup.matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
