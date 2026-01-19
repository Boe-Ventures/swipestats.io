/**
 * Reusable Image Gallery Display Component
 *
 * This component can be shared between property listings and other image galleries.
 * It handles the display logic but not the upload/storage logic, making it flexible
 * for both URL-based and blob-based image systems.
 *
 * Usage examples:
 * - Property listing image galleries (URL-based)
 * - User profile image previews (blob-based)
 * - Organization gallery features (future)
 * - Collection banner image selection (future)
 */

import type React from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "../button";

export interface ImageGalleryItem {
  url: string;
  alt?: string;
  isBanner?: boolean;
  isRemovable?: boolean;
}

export interface ImageGalleryDisplayProps {
  images: ImageGalleryItem[];
  onImageClick?: (imageUrl: string, index: number) => void;
  onImageRemove?: (imageUrl: string, index: number) => void;
  onSetBanner?: (imageUrl: string, index: number) => void;
  className?: string;
  columns?: 2 | 3 | 4;
  aspectRatio?: "square" | "auto";
  showBannerBadges?: boolean;
  showRemoveButtons?: boolean;
  emptyState?: React.ReactNode;
}

/**
 * Flexible image gallery component for displaying and managing images
 * Handles both URL-based (property listings) and blob-based (user/org) images
 */
export function ImageGalleryDisplay({
  images,
  onImageClick,
  onImageRemove,
  onSetBanner,
  className,
  columns = 3,
  aspectRatio = "square",
  showBannerBadges = false,
  showRemoveButtons = false,
  emptyState,
}: ImageGalleryDisplayProps) {
  if (images.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  const aspectClass =
    aspectRatio === "square" ? "aspect-square" : "aspect-auto";

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {images.map((imageItem, index) => {
        const { url, alt, isBanner, isRemovable = true } = imageItem;

        return (
          <div key={`${url}-${index}`} className="group relative">
            <div
              className={cn(
                "cursor-pointer overflow-hidden rounded-lg bg-gray-100 transition-all duration-200",
                aspectClass,
                isBanner && showBannerBadges
                  ? "ring-2 ring-blue-500 hover:ring-4 hover:ring-blue-400"
                  : "ring-2 ring-transparent hover:ring-2 hover:ring-blue-300",
              )}
              onClick={() => onImageClick?.(url, index)}
              title={
                isBanner && showBannerBadges
                  ? "This is the banner image"
                  : onSetBanner
                    ? "Click to make this the banner image"
                    : undefined
              }
            >
              <Image
                src={url}
                alt={alt || `Image ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                fill={aspectRatio === "square"}
                width={aspectRatio === "auto" ? 400 : undefined}
                height={aspectRatio === "auto" ? 400 : undefined}
                unoptimized
                onError={(e) => {
                  console.error("Failed to load image:", url);
                  // Fallback to error placeholder
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='200' y='180' text-anchor='middle' dy='.3em' fill='%23666' font-size='16'%3EImage Failed to Load%3C/text%3E%3Ctext x='200' y='220' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3ECheck image URL%3C/text%3E%3C/svg%3E";
                }}
              />

              {/* Banner Badge */}
              {isBanner && showBannerBadges && (
                <div className="absolute top-2 left-2 rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white">
                  Banner
                </div>
              )}

              {/* Remove Button */}
              {showRemoveButtons && isRemovable && onImageRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(url, index);
                  }}
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/*
 * Usage Examples:
 *
 * // Property Listing Gallery (URL-based)
 * <ImageGalleryDisplay
 *   images={propertyImages.map(img => ({
 *     url: img.url,
 *     isBanner: img.url === bannerImage,
 *     isRemovable: true
 *   }))}
 *   onImageClick={handleSetBanner}
 *   onImageRemove={handleRemoveImage}
 *   showBannerBadges={true}
 *   showRemoveButtons={true}
 *   columns={4}
 * />
 *
 * // User Profile Preview (blob-based)
 * <ImageGalleryDisplay
 *   images={[{
 *     url: user.image,
 *     alt: "Profile image",
 *     isRemovable: false
 *   }]}
 *   columns={1}
 *   aspectRatio="square"
 *   showRemoveButtons={false}
 * />
 */
