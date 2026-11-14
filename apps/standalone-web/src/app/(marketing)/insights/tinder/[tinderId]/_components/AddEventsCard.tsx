"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useDomain } from "@/domain/react";
import { AddEventDialog } from "@/app/app/events/AddEventDialog";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

/**
 * Simplified CTA card that opens the shared AddEventDialog
 */
export function AddEventsCard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { trackEvent } = useAnalytics();
  const domain = useDomain();

  // Fetch events count only
  const eventsQuery = useQuery(
    domain.event.list.queryOptions({
      input: undefined,
      ...{
        refetchOnWindowFocus: false,
      },
    }),
  );

  const eventCount = eventsQuery.data?.length ?? 0;

  // Handler for opening life events dialog with tracking
  const handleOpenEventDialog = () => {
    trackEvent("life_event_dialog_opened", {
      source: "insights_page",
      trigger: "button_click",
      hasExistingEvents: eventCount > 0,
      eventCount,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="h-full pb-0 shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold">Life Events</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpenEventDialog}>
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
