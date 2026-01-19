"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";
import { AddEventDialog } from "@/app/app/events/AddEventDialog";

/**
 * Simplified CTA card that opens the shared AddEventDialog
 */
export function AddEventsCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const trpc = useTRPC();

  // Fetch events count only
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
    }),
  );

  const eventCount = eventsQuery.data?.length ?? 0;

  return (
    <>
      <Card className="h-full pb-0 shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold">Life Events</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-muted-foreground mt-3 text-sm">
            Track important moments that shaped your dating journey
            {eventCount > 0 && (
              <>
                {" · "}
                <span className="font-medium">
                  {eventCount} event{eventCount !== 1 ? "s" : ""} tracked
                </span>
              </>
            )}
          </p>
        </CardHeader>
      </Card>

      {/* Shared Event Manager Dialog */}
      <AddEventDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
