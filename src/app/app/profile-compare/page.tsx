"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateComparisonDialog } from "./create-comparison-dialog";
import { ComingSoonWrapper } from "@/components/ComingSoonWrapper";

export default function ProfileCompareDashboard() {
  return (
    <ComingSoonWrapper
      featureName="Profile Comparisons"
      description="Compare your dating app profiles side-by-side to see which photos, bios, and prompts perform best"
      topic="waitlist-profile-compare"
      benefits={[
        "A/B test different profile versions",
        "Get feedback from other users",
        "Optimize for better matches",
      ]}
    >
      <ProfileCompareDashboardContent />
    </ComingSoonWrapper>
  );
}

function ProfileCompareDashboardContent() {
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
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile Comparisons</h1>
          <p className="text-muted-foreground mt-1">
            Compare your dating profiles side-by-side
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Comparison
        </Button>
      </div>

      {/* Comparisons Grid */}
      {!comparisons || comparisons.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Plus className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No comparisons yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md text-sm">
              Create your first profile comparison to see how your dating
              profiles look side-by-side across different apps.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Comparison
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((comparison) => {
            const thumbnail =
              comparison.columns[0]?.content[0]?.attachment?.url;
            const columnCount = comparison.columns.length;

            return (
              <Card key={comparison.id} className="overflow-hidden pt-0">
                {/* Thumbnail */}
                {thumbnail ? (
                  <div className="bg-muted relative aspect-square overflow-hidden">
                    <Image
                      src={thumbnail}
                      alt={comparison.name || "Profile comparison"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-muted flex aspect-square items-center justify-center">
                    <Plus className="text-muted-foreground h-12 w-12" />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {comparison.name || "Untitled Comparison"}
                  </CardTitle>
                  <CardDescription>
                    {columnCount} {columnCount === 1 ? "app" : "apps"} •{" "}
                    {formatDistanceToNow(new Date(comparison.updatedAt), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {comparison.columns.map((column) => (
                      <Badge key={column.id} variant="secondary">
                        {column.dataProvider}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-2">
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
      )}

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
    </div>
  );
}
