"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Quote,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Visibility = "all" | "public" | "private";
type Sort = "recent" | "feedback" | "columns";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ownerLabel(user: {
  email: string | null;
  username: string | null;
  name: string | null;
  isAnonymous: boolean | null;
}) {
  if (user.isAnonymous) return "Anonymous";
  return user.username ?? user.email ?? user.name ?? "Unknown";
}

export default function AdminProfileComparePage() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const limit = 20;

  const statsQuery = useQuery(trpc.admin.comparisonStats.queryOptions());
  const { data, isLoading } = useQuery(
    trpc.admin.listComparisons.queryOptions({ page, limit, visibility, sort }),
  );

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Compare</h1>
          <p className="mt-1 text-sm text-gray-600">
            Inspect every profile comparison people have built and shared.
          </p>
          {stats && (
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {stats.totalComparisons}
              </span>{" "}
              comparisons ·{" "}
              <span className="font-medium text-gray-700">
                {stats.publicComparisons}
              </span>{" "}
              shared publicly ·{" "}
              <span className="font-medium text-gray-700">
                {stats.totalFeedback}
              </span>{" "}
              feedback ·{" "}
              <span className="font-medium text-gray-700">
                {stats.totalRoasts}
              </span>{" "}
              roasts
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={visibility}
            onValueChange={(v) => {
              setVisibility(v as Visibility);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="public">Public (shared)</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as Sort);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="feedback">Most feedback</SelectItem>
              <SelectItem value="columns">Most columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* List */}
      {!isLoading && data && data.comparisons.length > 0 && (
        <>
          <div className="space-y-3">
            {data.comparisons.map((c, idx) => {
              const globalIndex = (data.page - 1) * limit + idx;
              return (
                <Card key={c.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="w-6 shrink-0 text-sm font-medium text-gray-400">
                      #{globalIndex + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                      {c.thumbnailUrl ? (
                        <Image
                          src={c.thumbnailUrl}
                          alt="Thumbnail"
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/profile-compare/${c.id}`}
                          className="truncate font-semibold text-gray-900 hover:underline"
                        >
                          {c.name ?? c.profileName ?? "Untitled comparison"}
                        </Link>
                        {c.isPublic ? (
                          <Badge variant="default">Public</Badge>
                        ) : (
                          <Badge variant="secondary">Private</Badge>
                        )}
                        {c.providers.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {ownerLabel(c.user)} · updated {formatDate(c.updatedAt)}
                      </p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Columns3 className="h-3 w-3" />
                          {c.columnCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {c.photoCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Quote className="h-3 w-3" />
                          {c.promptCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {c.feedbackCount}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      {c.isPublic && c.shareKey && (
                        <Link
                          href={`/share/profile-compare/${c.shareKey}`}
                          target="_blank"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Live
                          </Button>
                        </Link>
                      )}
                      <Link href={`/admin/profile-compare/${c.id}`}>
                        <Button variant="outline" size="sm" className="h-7">
                          Inspect
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-600">
              Page {data.page} of {data.totalPages} ({data.totalCount} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Empty */}
      {!isLoading && data?.comparisons.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Columns3 className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold">No comparisons</h3>
            <CardDescription className="mt-1">
              No profile comparisons match the selected filter.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
