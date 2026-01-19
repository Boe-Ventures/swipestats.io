"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch user's gallery photos
  const { data: galleryPhotos, isLoading: isLoadingGallery } = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );

  const createAttachmentMutation = useMutation(
    trpc.blob.createAttachmentFromBlob.mutationOptions({
      onError: (error) => {
        console.error("Failed to create attachment record:", error);
      },
    }),
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

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to blob storage (save to user_photo gallery)
      const clientPayload = {
        resourceType: "user_photo",
        resourceId: "gallery",
      };

      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/client-upload",
        clientPayload: JSON.stringify(clientPayload),
      });

      console.log("📎 File uploaded:", result.url);

      // Create attachment record in gallery
      const attachment = await createAttachmentMutation.mutateAsync({
        url: result.url,
        pathname: result.pathname,
        contentType: result.contentType || file.type,
        size: file.size,
        filename: file.name,
        resourceType: "user_photo",
        resourceId: "gallery",
      });

      // Add photo to column
      await addPhotoMutation.mutateAsync({
        columnId: columnId,
        attachmentId: attachment.id,
      });

      toast.success("Photo uploaded and added!");

      // Refresh gallery
      void queryClient.invalidateQueries(
        trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
      );
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleSelectPrompt = (selectedPrompt: Prompt) => {
    setPrompt(selectedPrompt.text);
    setSelectedPromptImageId(selectedPrompt.imageAttachmentId);
    // Keep focus on answer input after selecting prompt
  };

  const handleAddPrompt = async () => {
    if (!prompt.trim() || !answer.trim()) {
      toast.error("Please enter both prompt and answer");
      return;
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
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add prompt:", error);
    }
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
                      Upload New Image
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
                    <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
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
                              <img
                                src={photo.url}
                                alt={photo.originalFilename}
                                className="h-full w-full object-cover"
                              />
                              {isSelected && (
                                <div className="bg-primary absolute inset-0 flex items-center justify-center bg-black/50">
                                  <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
                                    <Check className="h-5 w-5 text-white" />
                                  </div>
                                </div>
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

              <Button
                onClick={handleAddPrompt}
                disabled={!prompt.trim() || !answer.trim()}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Prompt
              </Button>
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
