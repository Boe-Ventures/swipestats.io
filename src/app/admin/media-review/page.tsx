"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Filter,
  ExternalLink,
  X,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Media } from "@/server/db/schema";

function isValidImageUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export default function AdminMediaReviewPage() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState<"all" | "tinder" | "hinge">("all");
  const [lightbox, setLightbox] = useState<{
    media: Media[];
    index: number;
  } | null>(null);
  const limit = 10;

  const { data, isLoading } = useQuery(
    trpc.admin.listProfilesWithMedia.queryOptions({
      page,
      limit,
      platform,
    }),
  );

  const openLightbox = (media: Media[], index: number) => {
    setLightbox({ media, index });
  };

  const closeLightbox = () => setLightbox(null);

  const navigateLightbox = (direction: -1 | 1) => {
    if (!lightbox) return;
    const newIndex = lightbox.index + direction;
    if (newIndex >= 0 && newIndex < lightbox.media.length) {
      setLightbox({ ...lightbox, index: newIndex });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Review</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review user media across all profiles
            {data && (
              <span className="ml-1 font-medium">
                ({data.totalCount} profiles with media)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={platform}
            onValueChange={(v) => {
              setPlatform(v as "all" | "tinder" | "hinge");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tinder">Tinder</SelectItem>
              <SelectItem value="hinge">Hinge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Profile List */}
      {!isLoading && data && data.profiles.length > 0 && (
        <>
          <div className="space-y-6">
            {data.profiles.map((profile, idx) => {
              const globalIndex = (data.page - 1) * limit + idx;
              const validMedia = profile.media.filter((m) =>
                isValidImageUrl(m.url),
              );
              const invalidCount =
                profile.media.length - validMedia.length;

              return (
                <Card
                  key={`${profile.platform}-${profile.profileId}`}
                  className="overflow-hidden"
                >
                  {/* Profile Header */}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400">
                          #{globalIndex + 1}
                        </span>
                        <Badge
                          variant={
                            profile.platform === "tinder"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {profile.platform === "tinder"
                            ? "Tinder"
                            : "Hinge"}
                        </Badge>
                        <CardTitle className="text-base">
                          {profile.genderStr ?? "Unknown"},{" "}
                          {profile.ageAtUpload ?? "?"}
                        </CardTitle>
                        <CardDescription>
                          {profile.city && profile.country
                            ? `${profile.city}, ${profile.country}`
                            : profile.city ||
                              profile.country ||
                              "No location"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {profile.mediaCount} media
                          {invalidCount > 0 && (
                            <span className="text-yellow-600">
                              {" "}
                              ({invalidCount} invalid)
                            </span>
                          )}
                        </span>
                        <Link
                          href={
                            profile.platform === "tinder"
                              ? `/admin/insights/tinder/${profile.profileId}`
                              : `/insights/hinge/${profile.profileId}`
                          }
                          target="_blank"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {profile.bio && (
                      <p className="mt-1 max-w-2xl truncate text-xs italic text-gray-500">
                        &quot;{profile.bio}&quot;
                      </p>
                    )}
                    <p className="font-mono text-xs text-gray-400">
                      {profile.profileId}
                    </p>
                  </CardHeader>

                  {/* Media Grid */}
                  <CardContent>
                    {validMedia.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                        {validMedia.map((item, mediaIdx) => (
                          <div
                            key={item.id}
                            className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-gray-100 transition-all hover:ring-2 hover:ring-blue-300"
                            onClick={() =>
                              openLightbox(validMedia, mediaIdx)
                            }
                          >
                            {item.type === "photo" ||
                            item.type === "image" ? (
                              <Image
                                src={item.url}
                                alt={`Media ${mediaIdx + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 10vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <span className="text-muted-foreground text-[10px] font-medium">
                                  {item.type}
                                </span>
                              </div>
                            )}
                            {item.prompt && (
                              <div className="absolute top-0.5 right-0.5">
                                <Badge className="h-4 px-1 text-[8px]">
                                  P
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-2 text-center text-xs text-gray-400">
                        No displayable media (all URLs invalid)
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-gray-600">
              Page {data.page} of {data.totalPages} ({data.totalCount}{" "}
              profiles total)
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

      {/* Empty State */}
      {!isLoading && data?.profiles.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold">No profiles with media</h3>
            <p className="mt-1 text-sm text-gray-500">
              No profiles have associated media records for the selected
              platform.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!lightbox} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>
                  Photo {(lightbox?.index ?? 0) + 1} of{" "}
                  {lightbox?.media.length ?? 0}
                </span>
                {lightbox?.media[lightbox.index]?.type && (
                  <Badge variant="outline">
                    {lightbox.media[lightbox.index]?.type}
                  </Badge>
                )}
                {lightbox?.media[lightbox.index]?.fromSoMe && (
                  <Badge variant="secondary">Social Media</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!lightbox || lightbox.index <= 0}
                  onClick={() => navigateLightbox(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={
                    !lightbox ||
                    lightbox.index >= lightbox.media.length - 1
                  }
                  onClick={() => navigateLightbox(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeLightbox}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {lightbox?.media[lightbox.index] && (
            <div className="space-y-3">
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-gray-100">
                {lightbox.media[lightbox.index]?.type === "photo" ||
                lightbox.media[lightbox.index]?.type === "image" ? (
                  <Image
                    src={lightbox.media[lightbox.index]!.url}
                    alt="Selected media"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 896px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground">
                      {lightbox.media[lightbox.index]?.type}
                    </span>
                  </div>
                )}
              </div>

              {(lightbox.media[lightbox.index]?.prompt ||
                lightbox.media[lightbox.index]?.caption) && (
                <div className="space-y-1 text-sm">
                  {lightbox.media[lightbox.index]?.prompt && (
                    <p>
                      <span className="font-medium text-gray-500">
                        Prompt:{" "}
                      </span>
                      {lightbox.media[lightbox.index]?.prompt}
                    </p>
                  )}
                  {lightbox.media[lightbox.index]?.caption && (
                    <p>
                      <span className="font-medium text-gray-500">
                        Caption:{" "}
                      </span>
                      {lightbox.media[lightbox.index]?.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
