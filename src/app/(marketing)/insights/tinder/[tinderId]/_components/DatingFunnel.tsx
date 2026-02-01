"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Users,
  Flame,
  Calendar,
  TrendingUp,
  Edit2,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTinderProfile } from "../TinderProfileProvider";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface FunnelStage {
  stage: string;
  value: number;
  percent?: number;
  icon: typeof Flame;
  color: string;
}

/**
 * Dating funnel visualization showing conversion from swipes to conversations
 * with integrated real-world outcomes tracking
 */
export function DatingFunnel() {
  const { meta, tinderId, readonly } = useTinderProfile();
  const trpc = useTRPC();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [showExtendedFunnel, setShowExtendedFunnel] = useState(false);
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

  if (!meta) {
    return null;
  }

  const globalMeta = meta;

  // Calculate combined swipes total
  const combinedSwipesTotal =
    (globalMeta.swipeLikesTotal ?? 0) + (globalMeta.swipePassesTotal ?? 0);

  // Check if we have outcomes data
  const hasOutcomes =
    customDataQuery.data &&
    ((customDataQuery.data.dateAttended ?? 0) > 0 ||
      (customDataQuery.data.sleptWithEventually ?? 0) > 0 ||
      (customDataQuery.data.relationshipsStarted ?? 0) > 0);

  const stages: FunnelStage[] = [
    {
      stage: "Total Swipes",
      value: combinedSwipesTotal,
      icon: Flame,
      color: "from-slate-400 to-slate-500",
    },
    {
      stage: "Right Swipes",
      value: globalMeta.swipeLikesTotal,
      percent:
        combinedSwipesTotal > 0
          ? (globalMeta.swipeLikesTotal / combinedSwipesTotal) * 100
          : 0,
      icon: Heart,
      color: "from-slate-500 to-slate-600",
    },
    {
      stage: "Matches",
      value: globalMeta.matchesTotal,
      percent:
        globalMeta.swipeLikesTotal > 0
          ? (globalMeta.matchesTotal / globalMeta.swipeLikesTotal) * 100
          : 0,
      icon: Users,
      color: "from-slate-600 to-slate-700",
    },
    {
      stage: "Conversations",
      value: globalMeta.conversationsWithMessages,
      percent:
        globalMeta.matchesTotal > 0
          ? (globalMeta.conversationsWithMessages / globalMeta.matchesTotal) *
            100
          : 0,
      icon: MessageCircle,
      color: "from-slate-700 to-slate-800",
    },
  ];

  // Extended stages with outcomes (if available)
  const extendedStages: FunnelStage[] =
    hasOutcomes && showExtendedFunnel
      ? [
          ...stages,
          {
            stage: "Dates",
            value: customDataQuery.data?.dateAttended ?? 0,
            percent:
              globalMeta.conversationsWithMessages > 0
                ? ((customDataQuery.data?.dateAttended ?? 0) /
                    globalMeta.conversationsWithMessages) *
                  100
                : 0,
            icon: Calendar,
            color: "from-slate-700 to-slate-800",
          },
          {
            stage: "Sex",
            value: customDataQuery.data?.sleptWithEventually ?? 0,
            percent:
              (customDataQuery.data?.dateAttended ?? 0) > 0
                ? ((customDataQuery.data?.sleptWithEventually ?? 0) /
                    (customDataQuery.data?.dateAttended ?? 1)) *
                  100
                : 0,
            icon: Sparkles,
            color: "from-pink-600 to-pink-700",
          },
          {
            stage: "Relationships",
            value: customDataQuery.data?.relationshipsStarted ?? 0,
            percent:
              (customDataQuery.data?.sleptWithEventually ?? 0) > 0
                ? ((customDataQuery.data?.relationshipsStarted ?? 0) /
                    (customDataQuery.data?.sleptWithEventually ?? 1)) *
                  100
                : 0,
            icon: Heart,
            color: "from-slate-800 to-slate-900",
          },
        ]
      : stages;

  // Calculate match rate
  const matchRate = globalMeta.matchRate * 100;

  const displayStages = showExtendedFunnel ? extendedStages : stages;

  return (
    <>
      <Card className="overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">
                Your Dating Funnel
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Conversion rates through each stage
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{matchRate.toFixed(1)}%</div>
              <div className="text-muted-foreground text-xs">Match Rate</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {displayStages.map((item, _index) => {
              const Icon = item.icon;
              const widthPercent =
                (item.value / displayStages[0]!.value) * 100 || 0;

              return (
                <div key={item.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">{item.stage}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground tabular-nums">
                        {item.value.toLocaleString()}
                      </span>
                      {item.percent !== undefined && (
                        <span className="text-xs font-semibold text-pink-500">
                          {item.percent.toFixed(1)}% ↓
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted relative h-8 overflow-hidden rounded-lg">
                    <div
                      className={`absolute inset-y-0 left-0 bg-linear-to-r ${item.color} transition-all duration-500 ease-out`}
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                    {item.percent !== undefined && (
                      <div className="relative flex h-full items-center justify-center">
                        <span className="text-xs font-semibold text-white mix-blend-difference">
                          {item.percent.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Real-World Outcomes Section */}
            <div className="mt-6 border-t pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-muted-foreground h-5 w-5" />
                  <h4 className="font-semibold">Real-World Outcomes</h4>
                  {hasOutcomes && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowExtendedFunnel(!showExtendedFunnel)}
                    >
                      {showExtendedFunnel ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {hasOutcomes ? (
                <div className="bg-muted/50 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 text-sm">
                    <p className="font-medium break-words">
                      {customDataQuery.data?.dateAttended ?? 0} dates →{" "}
                      {customDataQuery.data?.sleptWithEventually ?? 0} intimate
                      → {customDataQuery.data?.relationshipsStarted ?? 0}{" "}
                      {(customDataQuery.data?.relationshipsStarted ?? 0) === 1
                        ? "relationship"
                        : "relationships"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Track what happens beyond the app.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="w-full sm:w-auto sm:shrink-0"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg border border-dashed p-4 text-center">
                  <p className="text-muted-foreground mb-3 text-sm">
                    Add your real-world dating outcomes to see the complete
                    journey
                  </p>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Outcomes
                  </Button>
                </div>
              )}
            </div>
          </div>
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
                : hasOutcomes
                  ? "Update"
                  : "Save"}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </>
  );
}
