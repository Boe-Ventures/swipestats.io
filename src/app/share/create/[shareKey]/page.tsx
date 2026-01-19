"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { EmptyPhotoSlots } from "./empty-photo-slots";
import { SelectedPhotosBar } from "./selected-photos-bar";
import { PhotoGalleryModal } from "./photo-gallery-modal";
import { PublishDialog } from "./publish-dialog";

export default function FriendCreationPage() {
  const params = useParams<{ shareKey: string }>();
  const router = useRouter();
  const shareKey = params.shareKey;
  const trpc = useTRPC();

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [gallerySlotIndex, setGallerySlotIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery(
    trpc.profileCompare.getForFriendCreation.queryOptions({
      shareKey,
    }),
  );

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(photoId)) {
        return prev; // Already selected
      }
      if (prev.length >= 6) {
        return prev; // Max 6 photos
      }
      // If we have a slot index, insert at that position
      if (gallerySlotIndex !== null && gallerySlotIndex < prev.length) {
        const newPhotos = [...prev];
        newPhotos.splice(gallerySlotIndex, 0, photoId);
        return newPhotos;
      }
      // Otherwise append
      return [...prev, photoId];
    });
    setGallerySlotIndex(null);
  };

  const handleSlotClick = (index: number) => {
    setGallerySlotIndex(index);
    setShowGalleryModal(true);
  };

  const handlePublishSuccess = () => {
    // Redirect to the main share page
    router.push(`/share/profile-compare/${shareKey}`);
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <header className="from-muted/30 to-background border-b bg-gradient-to-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-4 h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Comparison not found</h2>
          <p className="text-muted-foreground mt-2">
            This comparison may have been deleted or is no longer available.
          </p>
          <Link href="https://swipestats.io" className="mt-4 inline-block">
            <Button>Go to SwipeStats</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { comparison, owner, photos } = data;

  return (
    <>
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        shareKey={shareKey}
        selectedPhotos={selectedPhotos}
        onSuccess={handlePublishSuccess}
      />
      <div className="bg-background min-h-screen">
        {/* Header */}
        <header className="from-muted/30 to-background border-b bg-gradient-to-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Create a Profile Version
                </h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">👤</span>
                    {comparison.profileName || owner.name || "Profile"}
                  </span>
                  {comparison.name && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs">📋</span>
                      {comparison.name}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  Select up to 6 photos and arrange them to create your version
                  of this profile.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  disabled={selectedPhotos.length === 0}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {selectedPhotos.length === 0
                    ? "Select Photos to Publish"
                    : `Publish (${selectedPhotos.length})`}
                </Button>
                <Link href="https://swipestats.io" target="_blank">
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Create Your Own
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {photos.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="bg-muted mb-4 rounded-full p-4">
                  <ImageIcon className="text-muted-foreground h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  No photos available
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md text-sm">
                  The profile owner hasn't uploaded any photos yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Empty State or Selected Photos Bar */}
              {selectedPhotos.length === 0 ? (
                <EmptyPhotoSlots
                  selectedCount={0}
                  maxSlots={6}
                  onSlotClick={handleSlotClick}
                />
              ) : (
                <div className="mb-6">
                  <SelectedPhotosBar
                    selectedPhotos={selectedPhotos}
                    photos={photos}
                    onReorder={setSelectedPhotos}
                    onRemove={(photoId) =>
                      setSelectedPhotos((prev) =>
                        prev.filter((id) => id !== photoId),
                      )
                    }
                    onSlotClick={handleSlotClick}
                    maxSlots={6}
                  />
                </div>
              )}

              {/* Photo Gallery Modal */}
              <PhotoGalleryModal
                open={showGalleryModal}
                onOpenChange={setShowGalleryModal}
                photos={photos}
                selectedPhotos={selectedPhotos}
                onSelect={handlePhotoSelect}
                maxSelectable={6}
              />

              {/* Publish Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  disabled={selectedPhotos.length === 0}
                  size="lg"
                >
                  {selectedPhotos.length === 0
                    ? "Select at least 1 photo to publish"
                    : `Publish Your Version (${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"})`}
                </Button>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground text-sm">
              Created with{" "}
              <Link
                href="https://swipestats.io"
                className="font-semibold hover:underline"
              >
                SwipeStats
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
