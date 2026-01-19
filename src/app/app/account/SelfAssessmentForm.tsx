"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function SelfAssessmentForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const [currentHotness, setCurrentHotness] = useState(5);
  const [currentHappiness, setCurrentHappiness] = useState(5);

  const updateSelfAssessment = useMutation(
    trpc.user.updateSelfAssessment.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  // Update local state when user data loads
  useEffect(() => {
    if (user) {
      if (user.currentHotness) setCurrentHotness(user.currentHotness);
      if (user.currentHappiness) setCurrentHappiness(user.currentHappiness);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSelfAssessment.mutate({
      currentHotness,
      currentHappiness,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hotness">Current Hotness</Label>
            <span className="text-lg font-semibold text-purple-600">
              {currentHotness}/10
            </span>
          </div>
          <input
            id="hotness"
            type="range"
            min="1"
            max="10"
            value={currentHotness}
            onChange={(e) => setCurrentHotness(Number(e.target.value))}
            className="bg-muted h-2 w-full cursor-pointer appearance-none rounded-lg accent-purple-600"
            style={{
              background: `linear-gradient(to right, rgb(147 51 234) 0%, rgb(147 51 234) ${(currentHotness - 1) * 11.11}%, rgb(229 231 235) ${(currentHotness - 1) * 11.11}%, rgb(229 231 235) 100%)`,
            }}
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="happiness">Current Happiness</Label>
            <span className="text-lg font-semibold text-pink-600">
              {currentHappiness}/10
            </span>
          </div>
          <input
            id="happiness"
            type="range"
            min="1"
            max="10"
            value={currentHappiness}
            onChange={(e) => setCurrentHappiness(Number(e.target.value))}
            className="bg-muted h-2 w-full cursor-pointer appearance-none rounded-lg accent-pink-600"
            style={{
              background: `linear-gradient(to right, rgb(219 39 119) 0%, rgb(219 39 119) ${(currentHappiness - 1) * 11.11}%, rgb(229 231 235) ${(currentHappiness - 1) * 11.11}%, rgb(229 231 235) 100%)`,
            }}
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={updateSelfAssessment.isPending}>
        {updateSelfAssessment.isPending ? "Saving..." : "Save Changes"}
      </Button>

      {updateSelfAssessment.isSuccess && (
        <p className="text-sm text-green-600">
          Self assessment updated successfully!
        </p>
      )}
      {updateSelfAssessment.isError && (
        <p className="text-destructive text-sm">
          Error: {updateSelfAssessment.error.message}
        </p>
      )}
    </form>
  );
}
