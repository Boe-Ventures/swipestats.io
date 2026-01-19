"use client";

import { useState, useEffect } from "react";
import { Calendar, Sparkles, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface CompleteYourOutcomesProps {
  tinderProfileId: string;
}

export function CompleteYourOutcomes({
  tinderProfileId,
}: CompleteYourOutcomesProps) {
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dateAttended: 0,
    sleptWithEventually: 0,
    relationshipsStarted: 0,
  });

  const customDataQuery = useQuery(
    trpc.customData.get.queryOptions(
      { tinderProfileId },
      { refetchOnWindowFocus: false },
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
      tinderProfileId,
      ...formData,
    });
  };

  const handleNumberChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const hasOutcomes =
    customDataQuery.data &&
    ((customDataQuery.data.dateAttended ?? 0) > 0 ||
      (customDataQuery.data.sleptWithEventually ?? 0) > 0 ||
      (customDataQuery.data.relationshipsStarted ?? 0) > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-muted-foreground h-5 w-5" />
            <CardTitle>Real-World Outcomes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Track what happened beyond the app with your Tinder matches to see
            your complete dating journey.
          </p>

          {hasOutcomes ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-medium">Dates</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {customDataQuery.data?.dateAttended ?? 0}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="text-muted-foreground mb-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-medium">Intimate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {customDataQuery.data?.sleptWithEventually ?? 0}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="text-muted-foreground mb-1 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs font-medium">Relationships</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {customDataQuery.data?.relationshipsStarted ?? 0}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
                className="w-full"
              >
                Update Outcomes
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg border border-dashed p-6 text-center">
              <p className="text-muted-foreground mb-4 text-sm">
                Add your real-world dating outcomes to complete your journey
                visualization
              </p>
              <Button onClick={() => setDialogOpen(true)} className="w-full">
                Add Outcomes
              </Button>
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
