"use client";

import { useState, useEffect } from "react";
import { Edit2, Share2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/components/ui/theme";
import { useTinderProfile } from "../TinderProfileProvider";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type FunnelVariant } from "./funnel-colors";
import { TinderInsightsFunnelSVG } from "./TinderInsightsFunnelSVG";

export function TinderInsightsFunnel({
  variant = "neutral",
}: {
  variant?: FunnelVariant;
} = {}) {
  const { profile, meta, tinderId, readonly } = useTinderProfile();
  const trpc = useTRPC();
  const { resolvedTheme } = useTheme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dateAttended: 0,
    sleptWithEventually: 0,
    relationshipsStarted: 0,
  });

  const customDataQuery = useQuery(
    trpc.customData.get.queryOptions(
      { tinderProfileId: tinderId },
      { refetchOnWindowFocus: false, enabled: !readonly },
    ),
  );

  const upsertMutation = useMutation(
    trpc.customData.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Outcomes saved successfully");
        setDialogOpen(false);
        void customDataQuery.refetch();
      },
      onError: () => {
        toast.error("Failed to save outcomes");
      },
    }),
  );

  // Pre-fill form when data loads
  useEffect(() => {
    if (customDataQuery.data) {
      setFormData({
        dateAttended: customDataQuery.data.dateAttended ?? 0,
        sleptWithEventually: customDataQuery.data.sleptWithEventually ?? 0,
        relationshipsStarted: customDataQuery.data.relationshipsStarted ?? 0,
      });
    }
  }, [customDataQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate({
      tinderProfileId: tinderId,
      ...formData,
    });
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleShare = () => {
    toast.info("Share functionality coming soon!");
  };

  if (!profile || !meta) return null;

  // Compute derived values for the funnel SVG
  const combinedSwipesTotal =
    (meta.swipeLikesTotal ?? 0) + (meta.swipePassesTotal ?? 0);
  const noMatchesTotal = (meta.swipeLikesTotal ?? 0) - (meta.matchesTotal ?? 0);

  const globalMeta = {
    ...meta,
    combinedSwipesTotal,
    noMatchesTotal,
  };

  const customData = customDataQuery.data;
  const hasCustomData = customData && (customData.dateAttended ?? 0) > 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Your Tinder Insights</CardTitle>
              <CardDescription>
                {hasCustomData
                  ? "Visualize your complete path from swipes to relationships"
                  : "Your dating funnel from swipes to conversations"}
              </CardDescription>
            </div>
            {!readonly && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="shrink-0"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {hasCustomData ? "Edit" : "Add"} Outcomes
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="shrink-0"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button> */}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TinderInsightsFunnelSVG
            globalMeta={globalMeta}
            customData={customData ?? undefined}
            hasCustomData={!!hasCustomData}
            variant={variant}
            theme={resolvedTheme}
          />

          {!hasCustomData && (
            <div className="bg-muted/50 m-6 rounded-lg border border-dashed p-4">
              <p className="text-muted-foreground text-center text-sm">
                💡 Add your real-world outcomes above to see the complete
                journey beyond matches
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outcomes Dialog */}
      <SimpleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Real-World Outcomes"
        description="Track what happened beyond the app with your Tinder matches"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dateAttended">Dates Attended</Label>
              <Input
                id="dateAttended"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={formData.dateAttended}
                onChange={(e) =>
                  handleNumberChange("dateAttended", e.target.value)
                }
              />
              <p className="text-muted-foreground text-xs">
                How many dates from Tinder did you actually go on?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sleptWithEventually">Sexual Encounters</Label>
              <Input
                id="sleptWithEventually"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={formData.sleptWithEventually}
                onChange={(e) =>
                  handleNumberChange("sleptWithEventually", e.target.value)
                }
              />
              <p className="text-muted-foreground text-xs">
                How many matches did you become intimate with?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationshipsStarted">
                Relationships Started
              </Label>
              <Input
                id="relationshipsStarted"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={formData.relationshipsStarted}
                onChange={(e) =>
                  handleNumberChange("relationshipsStarted", e.target.value)
                }
              />
              <p className="text-muted-foreground text-xs">
                How many became official relationships?
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={upsertMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending
                ? "Saving..."
                : hasCustomData
                  ? "Update"
                  : "Save"}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </>
  );
}
