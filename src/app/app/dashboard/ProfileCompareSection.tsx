import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plus, ExternalLink, Trash2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

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
import { ComingSoonWrapper } from "@/components/ComingSoonWrapper";

export function ProfileCompareSection() {
  return (
    <ComingSoonWrapper
      featureName="Profile Comparisons"
      description="Compare your dating profiles side-by-side"
      topic="waitlist-profile-compare"
    >
      <ProfileCompareSectionContent />
    </ComingSoonWrapper>
  );
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {comparisons.slice(0, 3).map((comparison) => {
            const thumbnail =
              comparison.columns[0]?.content[0]?.attachment?.url;
            const columnCount = comparison.columns.length;

            return (
              <Card
                key={comparison.id}
                className="overflow-hidden border-gray-200 bg-white pt-0 shadow-sm transition-shadow hover:shadow-lg"
              >
                {/* Thumbnail */}
                {thumbnail ? (
                  <div className="bg-muted aspect-square overflow-hidden">
                    <img
                      src={thumbnail}
                      alt={comparison.name || "Profile comparison"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex aspect-square items-center justify-center">
                    <Plus className="text-muted-foreground h-12 w-12" />
                  </div>
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-1 text-base">
                    {comparison.name || "Untitled Comparison"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {columnCount} {columnCount === 1 ? "app" : "apps"} •{" "}
                    {formatDistanceToNow(new Date(comparison.updatedAt), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {comparison.columns.map((column) => (
                      <Badge
                        key={column.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {column.dataProvider}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-2 pt-0">
                  <Link
                    href={`/app/profile-compare/${comparison.id}`}
                    className="flex-1"
                  >
                    <Button className="w-full" size="sm">
                      View
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    title={
                      comparison.isPublic
                        ? "Public - anyone with link can view"
                        : "Private - only you can view"
                    }
                  >
                    {comparison.isPublic ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>

                  {comparison.isPublic && comparison.shareKey && (
                    <Link
                      href={`/share/profile-compare/${comparison.shareKey}`}
                      target="_blank"
                    >
                      <Button variant="ghost" size="sm" title="Open share link">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setComparisonToDelete(comparison.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
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
