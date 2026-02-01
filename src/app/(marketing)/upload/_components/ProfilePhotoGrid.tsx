import { useState } from "react";

interface Photo {
  url: string;
  alt?: string;
}

interface ProfilePhotoGridProps {
  photos: Photo[];
  gradientColors?: string; // Tailwind gradient classes
  initialPhotoCount?: number; // Number of photos to show initially
  onImageError?: (url: string, index: number) => void; // Callback when image fails to load
}

export function ProfilePhotoGrid({
  photos,
  gradientColors = "from-purple-700 via-purple-500 to-pink-400",
  initialPhotoCount = 6,
  onImageError,
}: ProfilePhotoGridProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  const displayPhotos = showAllPhotos
    ? photos
    : photos.slice(0, initialPhotoCount);
  const hasPhotos = photos.length > 0;

  const handleImageError = (url: string, idx: number) => {
    console.warn(`Failed to load image at index ${idx}:`, url);

    // Track broken image locally
    setBrokenImages((prev) => new Set(prev).add(idx));

    // Notify parent component
    if (onImageError) {
      onImageError(url, idx);
    }
  };

  if (!hasPhotos) {
    return null;
  }

  const brokenCount = brokenImages.size;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {displayPhotos.map((photo, idx) => (
          <div
            key={idx}
            className="aspect-square overflow-hidden rounded-lg bg-white/10"
          >
            <img
              src={photo.url}
              alt={photo.alt || `Photo ${idx + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Prevent infinite loop by checking if already using fallback
                if (!e.currentTarget.src.startsWith("data:image/svg")) {
                  handleImageError(photo.url, idx);
                  // Set fallback placeholder
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23ffffff' fill-opacity='0.1'/%3E%3Cpath d='M200 150 L200 250 M150 200 L250 200' stroke='%23ffffff' stroke-width='8' stroke-linecap='round' opacity='0.3'/%3E%3Ctext x='200' y='290' text-anchor='middle' fill='%23ffffff' font-size='12' opacity='0.5'%3EImage unavailable%3C/text%3E%3C/svg%3E";
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Show warning if some images failed to load */}
      {brokenCount > 0 && (
        <div className="text-center text-xs text-white/70">
          ⚠️ {brokenCount} image{brokenCount !== 1 ? "s" : ""} couldn&apos;t be
          loaded
          {brokenCount === photos.length ? " - these won't be saved" : ""}
        </div>
      )}

      {photos.length > initialPhotoCount && (
        <button
          onClick={() => setShowAllPhotos(!showAllPhotos)}
          className="w-full text-center text-xs text-white/90 transition-colors hover:text-white"
        >
          {showAllPhotos ? (
            <>Show less</>
          ) : (
            <>
              +{photos.length - initialPhotoCount} more photo
              {photos.length - initialPhotoCount !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
