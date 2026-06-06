"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/lib/utils";
import { useTinderProfile } from "../TinderProfileProvider";
import { RoastDialog } from "./RoastDialog";

export function RoastCtaCard() {
  const { tinderId, isOwner, isAnonymous } = useTinderProfile();
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);

  const canFetchRoast = isOwner && !isAnonymous;

  const roastQuery = useQuery(
    trpc.roast.getByProfile.queryOptions(
      { tinderProfileId: tinderId },
      {
        refetchOnWindowFocus: false,
        enabled: canFetchRoast,
      },
    ),
  );

  const existingRoast = roastQuery.data;
  const hasRoast = !!existingRoast;

  const scoreColor = existingRoast
    ? existingRoast.overallScore >= 70
      ? "text-green-600 dark:text-green-400"
      : existingRoast.overallScore >= 45
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
    : "";

  return (
    <>
      <Card
        className="group cursor-pointer border-rose-200/70 bg-gradient-to-br from-rose-50 to-white py-0 transition-colors hover:border-rose-300 dark:border-rose-900/40 dark:from-rose-950/20 dark:to-transparent dark:hover:border-rose-900/70"
        onClick={() => setDialogOpen(true)}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <Flame className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {hasRoast ? "Your AI Roast" : "Get Your AI Roast"}
              </h3>
              {hasRoast && (
                <Badge
                  variant="secondary"
                  className={cn("border-0 px-1.5 py-0 font-bold", scoreColor)}
                >
                  {existingRoast.overallScore}/100
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {hasRoast
                ? existingRoast.headline
                : "Brutally honest, data-driven comedy about your stats"}
            </p>
          </div>

          <Button
            size="sm"
            className="shrink-0 bg-rose-600 text-white hover:bg-rose-500"
            onClick={(e) => {
              e.stopPropagation();
              setDialogOpen(true);
            }}
          >
            {hasRoast ? "View" : "Get Roasted 🔥"}
          </Button>
        </CardContent>
      </Card>

      <RoastDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
