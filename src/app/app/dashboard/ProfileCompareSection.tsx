import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  ArrowRight,
  Images,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";

import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";

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
          {comparisons.slice(0, 3).map((comparison) => {
            const thumbnail =
              comparison.columns[0]?.content[0]?.attachment?.url;
            const columnCount = comparison.columns.length;
            const photoCount = comparison.columns.reduce(
              (sum, column) =>
                sum +
                column.content.filter((c) => c.attachment?.url).length,
              0,
            );
            const href = `/app/profile-compare/${comparison.id}`;

            return (
              <Card
                key={comparison.id}
                className="group relative flex flex-row gap-0 overflow-hidden border-gray-200 bg-white p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Thumbnail — left rail */}
                <Link
                  href={href}
                  className="bg-muted relative w-28 shrink-0 self-stretch overflow-hidden sm:w-44"
                >
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={comparison.name || "Profile comparison"}
                      fill
                      sizes="(min-width: 640px) 176px, 112px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="from-muted to-muted/60 flex h-full w-full items-center justify-center bg-gradient-to-br">
                      <Images className="text-muted-foreground/50 h-8 w-8" />
                    </div>
                  )}
                  {/* photo count chip */}
                  {photoCount > 0 && (
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      <Images className="h-3 w-3" />
                      {photoCount}
                    </span>
                  )}
                </Link>

                {/* Body */}
                <CardContent className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={href} className="min-w-0">
                        <h3 className="truncate text-base font-semibold tracking-tight group-hover:underline">
                          {comparison.name || "Untitled Comparison"}
                        </h3>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {columnCount} {columnCount === 1 ? "app" : "apps"} •{" "}
                          {formatDistanceToNow(new Date(comparison.updatedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </Link>
                      {/* Status, not an action — non-interactive badge */}
                      <Badge
                        variant={comparison.isPublic ? "secondary" : "outline"}
                        className="text-muted-foreground shrink-0 gap-1 font-normal"
                        title={
                          comparison.isPublic
                            ? "Public — anyone with the link can view"
                            : "Private — only you can view"
                        }
                      >
                        {comparison.isPublic ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {comparison.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>

                    {/* Provider brand chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {comparison.columns.map((column) => (
                        <ProviderIconChip
                          key={column.id}
                          config={getProviderConfig(column.dataProvider)}
                          className="h-7 w-7 rounded-lg"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={href} className="flex-1 sm:flex-none">
                      <Button size="sm" className="w-full sm:w-auto">
                        View
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>

                    <div className="ml-auto flex items-center gap-0.5">
                      {comparison.isPublic && comparison.shareKey && (
                        <Link
                          href={`/share/profile-compare/${comparison.shareKey}`}
                          target="_blank"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground h-8 w-8"
                            title="Open share link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        title="Delete comparison"
                        onClick={() => {
                          setComparisonToDelete(comparison.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
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
