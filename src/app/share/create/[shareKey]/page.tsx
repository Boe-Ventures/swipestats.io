"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ImageOff, Layers, List, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { dataProviderEnum, type DataProvider } from "@/server/db/schema";
import {
  getProviderConfig,
  type DisplayMode,
} from "@/app/app/profile-compare/[id]/provider-config";
import { StackView } from "@/app/app/profile-compare/[id]/stack-view";
import { FlowView } from "@/app/app/profile-compare/[id]/flow-view";
import { SelectedPhotosGrid } from "./selected-photos-grid";
import { PhotoGalleryDialog } from "./photo-gallery-dialog";
import { PublishDialog } from "./publish-dialog";

// The share page renders profiles with StackView; build a matching column from
// the friend's selection so the preview is pixel-identical to the live page.
type PreviewColumn = RouterOutputs["profileCompare"]["get"]["columns"][number];

const MAX_PHOTOS = 6;

export default function FriendCreationPage() {
  const params = useParams<{ shareKey: string }>();
  const router = useRouter();
  const shareKey = params.shareKey;
  const trpc = useTRPC();

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [gallerySlotIndex, setGallerySlotIndex] = useState<number | null>(null);
  // null = follow the comparison's own app; set = friend picked a different one
  const [providerOverride, setProviderOverride] = useState<DataProvider | null>(
    null,
  );
  // null = follow the provider's default view; set = user toggled Stack/Flow
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);

  const { data, isLoading } = useQuery(
    trpc.profileCompare.getForFriendCreation.queryOptions({ shareKey }),
  );

  const togglePhoto = (photoId: string) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      if (prev.length >= MAX_PHOTOS) return prev;
      if (gallerySlotIndex !== null && gallerySlotIndex < prev.length) {
        const next = [...prev];
        next.splice(gallerySlotIndex, 0, photoId);
        return next;
      }
      return [...prev, photoId];
    });
    setGallerySlotIndex(null);
  };

  const handleSlotClick = (index: number) => {
    setGallerySlotIndex(index);
    setShowGalleryDialog(true);
  };

  const photos = data?.photos ?? [];

  // Build a StackView-compatible column from the selection so the preview
  // matches the share page exactly. StackView only reads content + bio.
  const previewColumn = useMemo(() => {
    const content = selectedPhotos.map((id, index) => {
      const photo = photos.find((p) => p.id === id);
      return {
        id,
        type: "photo",
        caption: null,
        order: index,
        attachment: photo ? { url: photo.url } : null,
      };
    });
    return {
      id: "preview",
      title: null,
      bio: null,
      content,
    } as unknown as PreviewColumn;
  }, [selectedPhotos, photos]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <header className="from-muted/30 to-background border-b bg-linear-to-b">
          <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
        </header>
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          <Skeleton className="mx-auto aspect-[2/3] w-full max-w-sm rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
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
          <Link href="https://www.swipestats.io" className="mt-4 inline-block">
            <Button>Go to SwipeStats</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { comparison, owner } = data;
  const activeProvider = providerOverride ?? comparison.dataProvider;
  const providerConfig = getProviderConfig(activeProvider);
  const activeDisplayMode = displayMode ?? providerConfig.defaultDisplayMode;
  const ownerLabel = comparison.profileName || owner.name || "this profile";
  const canPublish = selectedPhotos.length > 0;

  return (
    <>
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        shareKey={shareKey}
        selectedPhotos={selectedPhotos}
        dataProvider={activeProvider}
        onSuccess={() => router.push(`/share/profile-compare/${shareKey}`)}
      />

      <PhotoGalleryDialog
        open={showGalleryDialog}
        onOpenChange={setShowGalleryDialog}
        photos={photos}
        selectedPhotos={selectedPhotos}
        onSelect={togglePhoto}
        maxSelectable={MAX_PHOTOS}
      />

      <div className="bg-background min-h-screen">
        {/* Header */}
        <header className="from-muted/30 to-background border-b bg-linear-to-b">
          <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary h-5 w-5" />
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    Build your version
                  </h1>
                </div>
                <p className="text-muted-foreground max-w-xl text-sm">
                  Pick and arrange up to {MAX_PHOTOS} photos from{" "}
                  <span className="text-foreground font-medium">
                    {ownerLabel}
                  </span>
                  &apos;s library to show how their {providerConfig.name} profile
                  should look.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-muted-foreground text-xs font-medium">
                    Styled as
                  </span>
                  <Select
                    value={activeProvider}
                    onValueChange={(v) =>
                      setProviderOverride(v as DataProvider)
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="h-8 rounded-full text-xs font-medium"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataProviderEnum.enumValues.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {getProviderConfig(provider).name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {comparison.name && (
                    <span className="text-muted-foreground text-xs">
                      · {comparison.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowPublishDialog(true)}
                  disabled={!canPublish}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {canPublish
                    ? `Publish (${selectedPhotos.length})`
                    : "Select photos to publish"}
                </Button>
                <Link href="https://www.swipestats.io" target="_blank">
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
        <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {photos.length === 0 ? (
            <div className="border-muted-foreground/25 mx-auto flex max-w-md flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
              <div className="bg-muted mb-4 rounded-full p-4">
                <ImageOff className="text-muted-foreground h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No photos available</h3>
              <p className="text-muted-foreground max-w-md text-sm">
                {ownerLabel} hasn&apos;t uploaded any photos yet, so there&apos;s
                nothing to build with.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
              {/* Live preview — same StackView the share page renders */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                <div className="mx-auto w-full max-w-sm">
                  {selectedPhotos.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <Tabs
                          value={activeDisplayMode}
                          onValueChange={(v) =>
                            setDisplayMode(v as DisplayMode)
                          }
                        >
                          <TabsList className="h-8">
                            <TabsTrigger value="stack" className="text-xs">
                              <Layers className="mr-1.5 h-3.5 w-3.5" />
                              Stack
                            </TabsTrigger>
                            <TabsTrigger value="flow" className="text-xs">
                              <List className="mr-1.5 h-3.5 w-3.5" />
                              Flow
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      {activeDisplayMode === "stack" ? (
                        <StackView
                          column={previewColumn}
                          providerConfig={providerConfig}
                          defaultBio={comparison.defaultBio ?? undefined}
                          profileName={comparison.profileName ?? undefined}
                          age={comparison.age ?? undefined}
                        />
                      ) : (
                        <FlowView
                          column={previewColumn}
                          providerConfig={providerConfig}
                          defaultBio={comparison.defaultBio ?? undefined}
                          profileName={comparison.profileName ?? undefined}
                          age={comparison.age ?? undefined}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="border-muted-foreground/25 bg-muted/30 flex aspect-[2/3] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center">
                      <div className="bg-background mb-4 rounded-full p-4 shadow-sm">
                        <Sparkles className="text-muted-foreground h-7 w-7" />
                      </div>
                      <p className="font-medium">Your version preview</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Add photos and they&apos;ll appear here as a{" "}
                        {providerConfig.name} profile.
                      </p>
                    </div>
                  )}
                  <p className="text-muted-foreground mt-3 text-center text-xs">
                    Live preview · tap the card to flip through photos
                  </p>
                </div>
              </div>

              {/* Arrangement panel */}
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Your photos</h2>
                    <p className="text-muted-foreground text-xs">
                      {selectedPhotos.length}/{MAX_PHOTOS} selected · drag to
                      reorder
                    </p>
                  </div>
                  {selectedPhotos.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setSelectedPhotos([])}
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <SelectedPhotosGrid
                  selectedPhotos={selectedPhotos}
                  photos={photos}
                  onReorder={setSelectedPhotos}
                  onRemove={(id) =>
                    setSelectedPhotos((prev) => prev.filter((p) => p !== id))
                  }
                  onAddSlot={handleSlotClick}
                  maxSlots={MAX_PHOTOS}
                />

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleSlotClick(selectedPhotos.length)}
                    disabled={selectedPhotos.length >= MAX_PHOTOS}
                  >
                    Browse {ownerLabel}&apos;s photos
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setShowPublishDialog(true)}
                    disabled={!canPublish}
                  >
                    {canPublish
                      ? `Publish your version (${selectedPhotos.length})`
                      : "Add at least 1 photo"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container mx-auto max-w-6xl px-4 text-center sm:px-6">
            <p className="text-muted-foreground text-sm">
              Created with{" "}
              <Link
                href="https://www.swipestats.io"
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
