"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      ? "text-green-400"
      : existingRoast.overallScore >= 45
        ? "text-amber-400"
        : "text-red-400"
    : "";

  return (
    <>
      <Card
        className="relative cursor-pointer overflow-hidden border-0 bg-gradient-to-br from-rose-950/80 via-pink-950/60 to-purple-950/80 shadow-lg ring-1 ring-rose-500/30 transition-all hover:ring-rose-500/60"
        onClick={() => setDialogOpen(true)}
      >
        {/* Gradient border glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-rose-500/10 via-transparent to-purple-500/10" />

        <CardContent className="flex items-center gap-4 p-6">
          {/* Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-2xl ring-1 ring-rose-500/30">
            <Flame className="h-6 w-6 text-rose-400" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">
                {hasRoast ? "Your AI Roast" : "Get Your AI Roast"}
              </h3>
              {hasRoast && (
                <Badge
                  variant="secondary"
                  className={`shrink-0 border-0 bg-white/10 font-bold ${scoreColor}`}
                >
                  {existingRoast.overallScore}/100
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm text-white/60">
              {hasRoast
                ? existingRoast.headline
                : "Brutally honest, data-driven comedy about your dating stats"}
            </p>
          </div>

          {/* CTA button */}
          <Button
            size="sm"
            className="shrink-0 bg-rose-600 text-white hover:bg-rose-500"
            onClick={(e) => {
              e.stopPropagation();
              setDialogOpen(true);
            }}
          >
            {hasRoast ? "View Roast" : "Get Roasted 🔥"}
          </Button>
        </CardContent>
      </Card>

      <RoastDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
