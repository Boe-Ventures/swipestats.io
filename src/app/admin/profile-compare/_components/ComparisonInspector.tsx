"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Comparison = NonNullable<
  ReturnType<typeof useComparison>["data"]
>;
type FeedbackItem = Comparison["feedback"][number];
type LightboxPhoto = { url: string; caption: string | null };

function useComparison(id: string) {
  const trpc = useTRPC();
  return useQuery(trpc.admin.getComparison.queryOptions({ id }));
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorLabel(author: FeedbackItem["author"]) {
  if (!author) return "Unknown";
  if (author.isAnonymous) return "Anonymous";
  return author.username ?? author.email ?? author.name ?? "Unknown";
}

function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400">No feedback.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((fb) => (
        <li key={fb.id} className="rounded-md border bg-gray-50 p-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-gray-700">
              {authorLabel(fb.author)}
              {fb.actorType === "system" && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  system
                </Badge>
              )}
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-400">
              {fb.rating !== null && (
                <span className="font-medium text-gray-600">
                  rating {fb.rating}
                </span>
              )}
              {formatDateTime(fb.createdAt)}
            </span>
          </div>
          {fb.body && <p className="mt-1 text-gray-700">{fb.body}</p>}
        </li>
      ))}
    </ul>
  );
}

export function ComparisonInspector({ id }: { id: string }) {
  const { data, isLoading, error } = useComparison(id);
  const [lightbox, setLightbox] = useState<{
    photos: LightboxPhoto[];
    index: number;
  } | null>(null);

  const navigate = (dir: -1 | 1) => {
    if (!lightbox) return;
    const next = lightbox.index + dir;
    if (next >= 0 && next < lightbox.photos.length) {
      setLightbox({ ...lightbox, index: next });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/profile-compare">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card className="py-12">
          <CardContent className="text-center text-gray-500">
            {error?.message ?? "Comparison not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta: Array<[string, string | number | null | undefined]> = [
    ["Age", data.age],
    ["Height", data.heightCm ? `${data.heightCm} cm` : null],
    [
      "Location",
      [data.city, data.state, data.country].filter(Boolean).join(", ") || null,
    ],
    ["Hometown", data.hometown],
    ["Nationality", data.nationality],
    ["Education", data.educationLevel],
  ];

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/profile-compare">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {data.name ?? data.profileName ?? "Untitled comparison"}
          </h1>
          {data.isPublic ? (
            <Badge variant="default">Public</Badge>
          ) : (
            <Badge variant="secondary">Private</Badge>
          )}
        </div>
        {data.isPublic && data.shareKey && (
          <Link href={`/share/profile-compare/${data.shareKey}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-4 w-4" />
              View live share
            </Button>
          </Link>
        )}
      </div>

      {/* Owner + meta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Owner & profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">
              {data.user?.isAnonymous
                ? "Anonymous"
                : (data.user?.username ??
                  data.user?.email ??
                  data.user?.name ??
                  "Unknown")}
            </span>
            {data.user?.email && !data.user.isAnonymous && (
              <span className="text-gray-400">{data.user.email}</span>
            )}
            {data.user?.swipestatsTier && (
              <Badge variant="outline">{data.user.swipestatsTier}</Badge>
            )}
          </div>

          {data.defaultBio && (
            <p className="max-w-2xl text-sm italic text-gray-600">
              &quot;{data.defaultBio}&quot;
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {meta
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="text-gray-700">{value}</dd>
                </div>
              ))}
            <div>
              <dt className="text-xs text-gray-400">Created</dt>
              <dd className="text-gray-700">{formatDateTime(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Updated</dt>
              <dd className="text-gray-700">{formatDateTime(data.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Columns */}
      {data.columns.map((column) => {
        const photos = column.content.filter(
          (c) => c.type === "photo" && c.attachment?.url,
        );
        const prompts = column.content.filter((c) => c.type === "prompt");
        const lightboxPhotos: LightboxPhoto[] = photos.map((p) => ({
          url: p.attachment!.url,
          caption: p.caption,
        }));

        const contentIds = new Set(column.content.map((c) => c.id));
        const columnFeedback = data.feedback.filter(
          (fb) =>
            fb.columnId === column.id ||
            (fb.contentId !== null && contentIds.has(fb.contentId)),
        );

        return (
          <Card key={column.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{column.dataProvider}</Badge>
                <CardTitle className="text-base">
                  {column.title ?? `Column ${column.order + 1}`}
                </CardTitle>
                {column.completedAt && (
                  <Badge variant="secondary">Marked done</Badge>
                )}
              </div>
              {column.bio && (
                <p className="mt-1 max-w-2xl text-sm italic text-gray-600">
                  &quot;{column.bio}&quot;
                </p>
              )}
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Photos */}
              {photos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-400">
                    Photos ({photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {photos.map((p, photoIdx) => (
                      <div
                        key={p.id}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-gray-100 transition-all hover:ring-2 hover:ring-blue-300"
                        onClick={() =>
                          setLightbox({
                            photos: lightboxPhotos,
                            index: photoIdx,
                          })
                        }
                      >
                        <Image
                          src={p.attachment!.url}
                          alt={p.caption ?? `Photo ${photoIdx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 16vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompts */}
              {prompts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400">
                    Prompts ({prompts.length})
                  </p>
                  {prompts.map((p) => (
                    <div key={p.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium text-gray-700">
                        {p.prompt ?? "—"}
                      </p>
                      <p className="mt-1 text-gray-600">{p.answer ?? "—"}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Roast */}
              {column.roast && (
                <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-900">
                      Roast
                    </span>
                    {column.roast.tone && (
                      <Badge variant="outline" className="text-xs">
                        {column.roast.tone}
                      </Badge>
                    )}
                    {column.roast.isPublic ? (
                      <Badge variant="default" className="text-xs">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Unpublished
                      </Badge>
                    )}
                  </div>
                  {column.roast.headline && (
                    <p className="mt-2 text-sm font-semibold text-gray-800">
                      {column.roast.headline}
                    </p>
                  )}
                  {column.roast.tagline && (
                    <p className="text-sm text-gray-600">
                      {column.roast.tagline}
                    </p>
                  )}
                  {column.roast.verdict && (
                    <p className="mt-1 text-sm text-gray-600">
                      {column.roast.verdict}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback */}
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-400">
                  <MessageSquare className="h-3 w-3" />
                  Feedback ({columnFeedback.length})
                </p>
                <FeedbackList items={columnFeedback} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Photo {(lightbox?.index ?? 0) + 1} of{" "}
                {lightbox?.photos.length ?? 0}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!lightbox || lightbox.index <= 0}
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    !lightbox || lightbox.index >= lightbox.photos.length - 1
                  }
                  onClick={() => navigate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLightbox(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {lightbox?.photos[lightbox.index] && (
            <div className="space-y-3">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={lightbox.photos[lightbox.index]!.url}
                  alt="Selected photo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 768px"
                />
              </div>
              {lightbox.photos[lightbox.index]?.caption && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Caption: </span>
                  {lightbox.photos[lightbox.index]?.caption}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
