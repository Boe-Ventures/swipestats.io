"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/golden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { CreateComparisonDialog } from "@/app/app/profile-compare/create-comparison-dialog";
import { ProfileComparisonCard } from "@/app/app/profile-compare/ProfileComparisonCard";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ProfileCompareSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [comparisonToDelete, setComparisonToDelete] = useState<string | null>(
    null,
  );

  const { data: comparisons, isLoading } = useQuery(
    trpc.profileCompare.list.queryOptions(),
  );
  const deleteMutation = useMutation(
    trpc.profileCompare.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Comparison deleted");
        setDeleteDialogOpen(false);
        setComparisonToDelete(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete comparison");
      },
    }),
  );

  const handleDelete = () => {
    if (comparisonToDelete) {
      deleteMutation.mutate(
        { id: comparisonToDelete },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries(
              trpc.profileCompare.list.queryOptions(),
            );
          },
        },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-medium tracking-[0.07em] text-gray-500 uppercase">
              Compose
            </div>
            <h2 className="mt-1 text-[26px] font-bold tracking-[-0.03em] text-gray-900">
              Profile comparisons
            </h2>
            <p className="mt-1 text-[14px] text-gray-600">
              A/B test photos, prompts, bios, and app profiles side by side.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New comparison
          </Button>
        </div>

        {!comparisons || comparisons.length === 0 ? (
          <Panel className="border-dashed bg-white p-0">
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-gray-200 bg-gray-50">
                <Plus className="h-7 w-7 text-gray-500" />
              </div>
              <h3 className="text-[17px] font-bold tracking-[-0.01em] text-gray-900">
                No comparisons yet
              </h3>
              <p className="mt-2 mb-6 max-w-[390px] text-[13.5px] leading-6 text-gray-600">
                Create your first comparison to see how your dating app profiles
                stack up. Compare photos, bios, prompts, and more side by side.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create first comparison
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="space-y-4">
            {comparisons.map((comparison) => (
              <ProfileComparisonCard
                key={comparison.id}
                comparison={comparison}
                onDelete={(id) => {
                  setComparisonToDelete(id);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Comparison Dialog */}
      <CreateComparisonDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comparison?</DialogTitle>
            <DialogDescription>
              This will permanently delete this comparison and all its data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
