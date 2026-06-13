"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { RoastCtaStrip } from "@/components/roast/roast-cta-strip";
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

  return (
    <>
      <RoastCtaStrip
        title={hasRoast ? "Your AI Roast" : "Get Your AI Roast"}
        badge={hasRoast ? existingRoast.tagline : undefined}
        description={
          (hasRoast && existingRoast.headline) ||
          "Brutally honest, data-driven comedy about your stats"
        }
        actionLabel={hasRoast ? "View" : "Get Roasted"}
        onClick={() => setDialogOpen(true)}
      />

      <RoastDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
