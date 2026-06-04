"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Plus,
  Check,
  List,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PromptSelector } from "./prompt-selector";
import { useGalleryUpload } from "../_hooks/useGalleryUpload";
import type { Prompt } from "@/lib/prompt-bank";

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string;
  comparisonId: string;
  appName: string;
}

type ContentType = "image" | "prompt";

export function AddContentDialog({
  open,
  onOpenChange,
  columnId,
  comparisonId,
  appName,
}: AddContentDialogProps) {
  const [contentType, setContentType] = useState<ContentType>("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  // Image selection state
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set(),
  );
  const [photoCaption, setPhotoCaption] = useState("");

  // Prompt state
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false);
  const [selectedPromptImageId, setSelectedPromptImageId] = useState<
    string | undefined
  >();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useGalleryUpload();

  // Fetch user's gallery photos
  const { data: galleryPhotos, isLoading: isLoadingGallery } = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );

  const addPhotoMutation = useMutation(
    trpc.profileCompare.addPhotoToColumn.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add photo");
      },
    }),
  );

  const addContentMutation = useMutation(
    trpc.profileCompare.addContentToColumn.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        toast.success("Content added!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add content");
      },
    }),
  );

  const handleTogglePhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotoIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotoIds(newSelected);
  };

  const handleAddSelectedPhotos = async () => {
    if (selectedPhotoIds.size === 0) {
      toast.error("Please select at least one photo");
      return;
    }

    try {
      // Add all selected photos to the column
      const promises = Array.from(selectedPhotoIds).map((attachmentId) =>
        addPhotoMutation.mutateAsync({
          columnId,
          attachmentId,
          // Include caption only if provided and single photo selected
          caption:
            selectedPhotoIds.size === 1 && photoCaption
              ? photoCaption
              : undefined,
        }),
      );

      await Promise.all(promises);

      toast.success(
        `${selectedPhotoIds.size} ${selectedPhotoIds.size === 1 ? "photo" : "photos"} added`,
      );

      setSelectedPhotoIds(new Set());
      setPhotoCaption("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add photos:", error);
    }
  };

  // Upload one or more new photos to the gallery, then add them all to this
  // column. The gallery itself is a shared library — newly uploaded photos also
  // become available to every other profile.
  const handleUploadNewPhotos = async (files: File[]) => {
    if (files.length === 0) return;

    const attachments = await uploadFiles(files, { successToast: false });
    if (attachments.length === 0) return;

    try {
      await Promise.all(
        attachments.map((attachment) =>
          addPhotoMutation.mutateAsync({
            columnId,
            attachmentId: attachment.id,
          }),
        ),
      );
      toast.success(
        `${attachments.length} ${attachments.length === 1 ? "photo" : "photos"} added`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add uploaded photos:", error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Reset input so the same files can be selected again.
    e.target.value = "";
    void handleUploadNewPhotos(files);
  };

  const handleSelectPrompt = (selectedPrompt: Prompt) => {
    setPrompt(selectedPrompt.text);
    setSelectedPromptImageId(selectedPrompt.imageAttachmentId);
    // Keep focus on answer input after selecting prompt
  };

  // Submit the prompt and clear the fields. Returns true on success so callers
  // can decide whether to close the dialog or keep it open for another entry.
  const submitPrompt = async () => {
    if (!prompt.trim() || !answer.trim()) {
      toast.error("Please enter both prompt and answer");
      return false;
    }

    try {
      await addContentMutation.mutateAsync({
        columnId,
        type: "prompt",
        prompt: prompt.trim(),
        answer: answer.trim(),
        attachmentId: selectedPromptImageId, // Include image if prompt has one
      });

      // Reset form
      setPrompt("");
      setAnswer("");
      setSelectedPromptImageId(undefined);
      return true;
    } catch (error) {
      console.error("Failed to add prompt:", error);
      return false;
    }
  };

  const handleAddPrompt = async () => {
    if (await submitPrompt()) onOpenChange(false);
  };

  const handleAddAnotherPrompt = async () => {
    if (await submitPrompt()) promptInputRef.current?.focus();
  };

  const handleClose = () => {
    // Reset form
    setPrompt("");
    setAnswer("");
    setPhotoCaption("");
    setSelectedPhotoIds(new Set());
    setSelectedPromptImageId(undefined);
    onOpenChange(false);
  };

  return (
    <>
      <SimpleDialog
        title={`Add Content to ${appName}`}
        description="Add photos or prompts to your profile"
        open={open}
        onOpenChange={handleClose}
        size="lg"
        scrollable
      >
        <Tabs
          value={contentType}
          onValueChange={(v) => setContentType(v as ContentType)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </TabsTrigger>
            <TabsTrigger value="prompt">
              <MessageSquare className="mr-2 h-4 w-4" />
              Prompt
              <span className="text-muted-foreground ml-2 text-xs">(V2)</span>
            </TabsTrigger>
          </TabsList>

          {/* Image Tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="space-y-4 py-4">
              {/* Upload New Button */}
              <div>
                <Label>Upload New Images</Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  JPG, PNG, WebP, or GIF • Max 10MB
                </p>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  variant="outline"
                  className="mt-2 w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload New Images
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or choose from gallery
                  </span>
                </div>
              </div>

              {/* Gallery Selection */}
              <div>
                <Label>Your Photos ({galleryPhotos?.length || 0})</Label>

                {isLoadingGallery ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="aspect-square" />
                    ))}
                  </div>
                ) : !galleryPhotos || galleryPhotos.length === 0 ? (
                  <div className="bg-muted/50 mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
                    <ImageIcon className="text-muted-foreground mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      No photos in gallery
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Upload your first photo above
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {galleryPhotos
                        .filter((photo) => photo.mimeType.startsWith("image/"))
                        .map((photo) => {
                          const isSelected = selectedPhotoIds.has(photo.id);
                          return (
                            <button
                              key={photo.id}
                              onClick={() => handleTogglePhoto(photo.id)}
                              className={`group relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                                isSelected
                                  ? "border-primary ring-primary/20 ring-2"
                                  : "hover:border-muted-foreground/50 border-transparent"
                              }`}
                            >
                              <Image
                                src={photo.url}
                                alt={photo.originalFilename}
                                fill
                                className="object-cover"
                              />
                              {isSelected && (
                                <>
                                  <div className="absolute inset-0 bg-black/20" />
                                  <div className="bg-primary absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full shadow-md ring-2 ring-white">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </>
                              )}
                            </button>
                          );
                        })}
                    </div>

                    {selectedPhotoIds.size > 0 && (
                      <>
                        {/* Caption input - only show for single photo */}
                        {selectedPhotoIds.size === 1 && (
                          <div className="mt-4">
                            <Label htmlFor="photoCaption">
                              Caption (optional)
                            </Label>
                            <Input
                              id="photoCaption"
                              value={photoCaption}
                              onChange={(e) => setPhotoCaption(e.target.value)}
                              placeholder="e.g., Too tall to be a hobbit"
                              className="mt-1"
                            />
                            <p className="text-muted-foreground mt-1 text-xs">
                              Add a caption like in Tinder
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={handleAddSelectedPhotos}
                          disabled={addPhotoMutation.isPending}
                          className="mt-4 w-full"
                        >
                          {addPhotoMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add {selectedPhotoIds.size}{" "}
                              {selectedPhotoIds.size === 1 ? "Photo" : "Photos"}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-4">
            <div className="space-y-4 py-4">
              {/* Browse Prompts Button */}
              <div>
                <Label>Choose a Prompt</Label>
                <Button
                  variant="outline"
                  onClick={() => setPromptSelectorOpen(true)}
                  className="mt-1 w-full"
                >
                  <List className="mr-2 h-4 w-4" />
                  Browse Prompt Bank
                </Button>
                <p className="text-muted-foreground mt-1 text-xs">
                  Or type your own custom prompt below
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or custom prompt
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Input
                  ref={promptInputRef}
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., My simple pleasures"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer</Label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g., Coffee and long walks"
                  className="border-input bg-background mt-1 min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleAddAnotherPrompt}
                  disabled={
                    !prompt.trim() ||
                    !answer.trim() ||
                    addContentMutation.isPending
                  }
                  className="flex-1"
                >
                  {addContentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add &amp; Add Another
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleAddPrompt}
                  disabled={
                    !prompt.trim() ||
                    !answer.trim() ||
                    addContentMutation.isPending
                  }
                  className="flex-1"
                >
                  {addContentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add & Close"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SimpleDialog>

      {/* Prompt Selector Dialog */}
      <PromptSelector
        open={promptSelectorOpen}
        onOpenChange={setPromptSelectorOpen}
        onSelect={handleSelectPrompt}
        currentApp={
          appName === "TINDER" || appName === "HINGE" ? appName : undefined
        }
      />
    </>
  );
}
