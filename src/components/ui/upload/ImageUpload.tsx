"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Camera, Download, Eye, Loader2, Trash2, X } from "lucide-react";

import { cn } from "../lib/utils";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { toast } from "../toast";
import { optimizeImage, shouldOptimizeImage } from "./SimpleImageOptimization";

// Types
export interface ImageUploadProps {
  onUploadComplete?: (result: ImageUploadResult) => void;
  onUploadStart?: (file: File) => void;
  onUploadError?: (error: string) => void;
  onRemove?: (url: string) => void;
  existingImages?: ImageUploadResult[];
  maxImages?: number;
  maxSize?: number; // in bytes
  uploadMode?: "server" | "client" | "auto";
  resourceType?: string;
  resourceId?: string;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
  aspectRatio?: "square" | "landscape" | "portrait" | "auto";
  placeholder?: string;
}

export interface ImageUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  filename: string;
  id?: string;
  alt?: string;
  width?: number;
  height?: number;
  order?: number;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB for images
const SERVER_MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB

export function ImageUpload({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  onRemove,
  existingImages = [],
  maxImages = 10,
  maxSize = DEFAULT_MAX_SIZE,
  uploadMode = "auto",
  resourceType,
  resourceId,
  disabled = false,
  className,
  showPreview = true,
  aspectRatio = "auto",
  placeholder = "Upload images",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [images, setImages] = useState<ImageUploadResult[]>(existingImages);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update images when existingImages prop changes
  React.useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  // Validate image file
  const validateImage = useCallback(
    (file: File): string | null => {
      // Check if it's an image
      if (!IMAGE_TYPES.includes(file.type)) {
        return `File type ${file.type} not supported. Please upload JPEG, PNG, WebP, or GIF images.`;
      }

      // Check file size
      if (file.size > maxSize) {
        return `Image size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
      }

      // Check max images limit
      if (images.length >= maxImages) {
        return `Maximum ${maxImages} images allowed`;
      }

      return null;
    },
    [maxSize, images.length, maxImages],
  );

  // Get image dimensions
  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
        };
        img.src = URL.createObjectURL(file);
      });
    },
    [],
  );

  // Upload image
  const uploadImage = useCallback(
    async (file: File): Promise<ImageUploadResult> => {
      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      const alt = `${file.name.split(".")[0]} image`;

      if (
        uploadMode === "server" ||
        (uploadMode === "auto" && file.size <= SERVER_MAX_SIZE)
      ) {
        // Server upload
        const searchParams = new URLSearchParams();
        searchParams.set("filename", file.name);
        searchParams.set("alt", alt);
        if (resourceType) searchParams.set("resourceType", resourceType);
        if (resourceId) searchParams.set("resourceId", resourceId);

        const response = await fetch(
          `/api/blob/upload?${searchParams.toString()}`,
          {
            method: "POST",
            body: file,
          },
        );

        if (!response.ok) {
          const error = (await response.json()) as { error?: string };
          throw new Error(error.error || "Upload failed");
        }

        const result = (await response.json()) as ImageUploadResult;
        return {
          ...result,
          alt,
          width: dimensions.width,
          height: dimensions.height,
          order: images.length,
        };
      } else {
        // Client upload
        const clientPayload = {
          resourceType,
          resourceId,
          alt,
        };

        const result = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/client-upload",
          clientPayload: JSON.stringify(clientPayload),
        });

        return {
          url: result.url,
          pathname: result.pathname,
          contentType: result.contentType || file.type,
          size: file.size,
          filename: file.name,
          alt,
          width: dimensions.width,
          height: dimensions.height,
          order: images.length,
        };
      }
    },
    [uploadMode, resourceType, resourceId, images.length, getImageDimensions],
  );

  // Handle image upload
  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateImage(file);
      if (validationError) {
        onUploadError?.(validationError);
        toast.error(validationError);
        return;
      }

      setUploading(true);
      onUploadStart?.(file);

      try {
        console.log(`📸 Uploading image: ${file.name} (${file.size} bytes)`);

        // Optimize image if needed
        let fileToUpload = file;
        if (shouldOptimizeImage(file)) {
          try {
            const optimized = await optimizeImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.9,
              format: "auto",
            });
            fileToUpload = optimized.file;
            console.log(
              `✨ Optimized image: ${optimized.originalSize} → ${optimized.optimizedSize} bytes (${Math.round((1 - optimized.optimizedSize / optimized.originalSize) * 100)}% reduction)`,
            );
            toast.info(
              `Image optimized: ${(optimized.originalSize / 1024 / 1024).toFixed(1)}MB → ${(optimized.optimizedSize / 1024 / 1024).toFixed(1)}MB`,
            );
          } catch (optimizeError) {
            console.warn(
              "Failed to optimize image, uploading original:",
              optimizeError,
            );
            // Continue with original file if optimization fails
          }
        }

        const result = await uploadImage(fileToUpload);

        // Add to images list
        const newImages = [...images, result];
        setImages(newImages);

        onUploadComplete?.(result);
        toast.success(`Image uploaded: ${file.name}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        onUploadError?.(errorMessage);
        toast.error(`Upload failed: ${errorMessage}`);
      } finally {
        setUploading(false);
      }
    },
    [
      validateImage,
      uploadImage,
      images,
      onUploadStart,
      onUploadComplete,
      onUploadError,
    ],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Process files sequentially to maintain order
      for (const file of files) {
        if (IMAGE_TYPES.includes(file.type)) {
          await handleUpload(file);
        }
      }
    },
    [handleUpload],
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      void handleFileSelect(files);
    },
    [disabled, handleFileSelect],
  );

  // Remove image
  const handleRemoveImage = useCallback(
    (imageUrl: string, index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);
      onRemove?.(imageUrl);
      toast.success("Image removed");
    },
    [images, onRemove],
  );

  // Preview image
  const handlePreviewImage = useCallback((url: string) => {
    setPreviewUrl(url);
  }, []);

  // Close preview
  const closePreview = useCallback(() => {
    setPreviewUrl(null);
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get aspect ratio class
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "landscape":
        return "aspect-video";
      case "portrait":
        return "aspect-[3/4]";
      default:
        return "aspect-auto";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <Card
          className={cn(
            "cursor-pointer border-2 border-dashed transition-colors",
            dragActive && "border-primary bg-primary/5",
            uploading && "border-blue-500 bg-blue-50",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept={IMAGE_TYPES.join(",")}
              multiple={maxImages > 1}
              disabled={disabled}
              className="hidden"
            />

            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Uploading image...</p>
              </>
            ) : (
              <>
                <Camera className="text-muted-foreground h-8 w-8" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{placeholder}</p>
                  <p className="text-muted-foreground text-xs">
                    {images.length}/{maxImages} images • Max{" "}
                    {formatFileSize(maxSize)} each
                    <br />
                    Supports JPEG, PNG, WebP, GIF
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <Card key={image.url} className="overflow-hidden">
              <div className="group relative">
                <div className={cn("relative w-full", getAspectRatioClass())}>
                  <Image
                    src={image.url}
                    alt={image.alt || `Image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>

                {/* Overlay with actions */}
                <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {showPreview && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePreviewImage(image.url)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(image.url, "_blank")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveImage(image.url, index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image info badges */}
                <div className="absolute top-2 left-2 space-y-1">
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Primary
                    </Badge>
                  )}
                  {image.width && image.height && (
                    <Badge
                      variant="outline"
                      className="bg-black/50 text-xs text-white"
                    >
                      {image.width}×{image.height}
                    </Badge>
                  )}
                </div>

                {/* File size badge */}
                <div className="absolute right-2 bottom-2">
                  <Badge
                    variant="outline"
                    className="bg-black/50 text-xs text-white"
                  >
                    {formatFileSize(image.size)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
        >
          <div className="relative max-h-full max-w-4xl">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 z-10"
              onClick={closePreview}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="relative h-full w-full">
              <Image
                src={previewUrl}
                alt="Preview"
                width={800}
                height={600}
                className="max-h-full max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Info */}
      {uploadMode === "auto" && (
        <p className="text-muted-foreground text-center text-xs">
          Images under 4.5MB use fast server upload, larger images use direct
          upload
        </p>
      )}
    </div>
  );
}

export default ImageUpload;
