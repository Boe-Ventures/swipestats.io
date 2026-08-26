"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Image as ImageIcon } from "lucide-react";
import type { Media } from "@/server/db/schema";

interface MediaGalleryCardProps {
  media: Media[];
}

interface SelectedMedia {
  item: Media;
  url: string;
  label: string;
  index: number;
  total: number;
  anonymized: boolean;
}

function isValidImageUrl(url: string): boolean {
  try {
    // Check if it's a valid URL (starts with http:// or https://)
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

export function MediaGalleryCard({ media }: MediaGalleryCardProps) {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(
    null,
  );

  // Split media into valid and invalid URLs
  const validMedia = media.filter((item) => isValidImageUrl(item.url));
  const invalidMedia = media.filter((item) => !isValidImageUrl(item.url));
  const anonymizedMedia = media.flatMap((item) =>
    item.swipeRankAnonymizedUrl && isValidImageUrl(item.swipeRankAnonymizedUrl)
      ? [{ item, url: item.swipeRankAnonymizedUrl }]
      : [],
  );

  return (
    <div className="space-y-6">
      {/* Valid Media Gallery */}
      {validMedia.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Original media ({validMedia.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {validMedia.map((item, index) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-gray-100 transition-all hover:shadow-lg"
                    onClick={() =>
                      setSelectedMedia({
                        item,
                        url: item.url,
                        label: "Original photo",
                        index: index + 1,
                        total: validMedia.length,
                        anonymized: false,
                      })
                    }
                  >
                    {item.type === "photo" || item.type === "image" ? (
                      <Image
                        src={item.url}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-muted-foreground text-xs font-medium">
                          {item.type}
                        </span>
                      </div>
                    )}

                    {/* Index Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>

                    {/* Prompt Indicator */}
                    {item.prompt && (
                      <div className="absolute right-2 bottom-2">
                        <Badge className="text-xs">Has Prompt</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-violet-200 bg-violet-50/30">
        <CardHeader>
          <CardTitle>
            SwipeRank anonymized images ({anonymizedMedia.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anonymizedMedia.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {anonymizedMedia.map(({ item, url }, index) => (
                <div
                  key={`anonymized-${item.id}`}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-violet-200 bg-gray-100 transition-all hover:shadow-lg"
                  onClick={() =>
                    setSelectedMedia({
                      item,
                      url,
                      label: "Anonymized photo",
                      index: index + 1,
                      total: anonymizedMedia.length,
                      anonymized: true,
                    })
                  }
                >
                  <Image
                    src={url}
                    alt={`Anonymized photo ${index + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-violet-700 text-xs text-white">
                      Admin-safe #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="mb-2 h-12 w-12 text-violet-300" />
              <p className="text-muted-foreground text-sm">
                No approved SwipeRank derivatives saved for this profile
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedMedia?.label} {selectedMedia?.index ?? 0} of{" "}
                {selectedMedia?.total ?? 0}
              </span>
              <button
                onClick={() => setSelectedMedia(null)}
                className="hover:bg-accent rounded-full p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                {selectedMedia.item.type === "photo" ||
                selectedMedia.item.type === "image" ? (
                  <Image
                    src={selectedMedia.url}
                    alt={selectedMedia.label}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 896px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground">
                      {selectedMedia.item.type}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedMedia.item.type}</Badge>
                  {selectedMedia.anonymized && (
                    <Badge className="bg-violet-700 text-white">
                      SwipeRank admin-safe
                    </Badge>
                  )}
                  {selectedMedia.item.fromSoMe && (
                    <Badge variant="outline">From Social Media</Badge>
                  )}
                </div>

                {selectedMedia.anonymized && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground font-medium">
                        Faces detected:
                      </span>{" "}
                      {selectedMedia.item.swipeRankAnonymizedFaceCount ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground font-medium">
                        Reviewed by:
                      </span>{" "}
                      {selectedMedia.item.swipeRankAnonymizationModel ?? "—"}
                    </p>
                  </div>
                )}

                {selectedMedia.item.prompt && (
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Prompt:
                    </span>
                    <p className="mt-1">{selectedMedia.item.prompt}</p>
                  </div>
                )}

                {selectedMedia.item.caption && (
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Caption:
                    </span>
                    <p className="mt-1">{selectedMedia.item.caption}</p>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground font-medium">
                    {selectedMedia.anonymized ? "Derivative URL:" : "URL:"}
                  </span>
                  <code className="mt-1 block rounded bg-gray-100 p-2 text-xs break-all">
                    {selectedMedia.url}
                  </code>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* No Valid Media Message */}
      {validMedia.length === 0 && invalidMedia.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Original media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="text-muted-foreground mb-2 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                No media found for this profile
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Media Section */}
      {invalidMedia.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <span>⚠️ Invalid Media URLs ({invalidMedia.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-yellow-800">
              These media entries have relative file paths instead of absolute
              URLs. They cannot be displayed.
            </p>
            <div className="space-y-2">
              {invalidMedia.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded border border-yellow-300 bg-white p-3 text-sm"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.prompt && (
                      <Badge variant="outline" className="text-xs">
                        Has Prompt
                      </Badge>
                    )}
                  </div>
                  <code className="block text-xs break-all text-gray-700">
                    {item.url}
                  </code>
                  {item.prompt && (
                    <p className="mt-2 text-xs text-gray-600">
                      Prompt: {item.prompt}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
