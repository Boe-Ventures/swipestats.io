import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { ProfileComparisonCard } from "@/app/app/profile-compare/ProfileComparisonCard";

import { useTRPC } from "@/trpc/react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProfileCompareSection() {
  return <ProfileCompareSectionContent />;
}

function ProfileCompareSectionContent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Profile Comparisons
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Compare your dating app profiles side-by-side
          </p>
        </div>

        <Card className="border-dashed border-gray-300 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Plus className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No comparisons yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              Create your first profile comparison to see how your dating app
              profiles stack up against each other. Compare photos, bios, and
              more side-by-side.
            </p>
            <Link href="/app/profile-compare">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Comparison
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Your Profile Comparisons
            </h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Compare your dating profiles side-by-side
            </p>
          </div>
          <Link href="/app/profile-compare">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {comparisons.slice(0, 3).map((comparison) => (
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
      </div>

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
