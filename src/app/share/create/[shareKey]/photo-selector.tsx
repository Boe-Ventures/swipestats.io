"use client";

import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";

interface Photo {
  id: string;
  url: string;
  originalFilename: string;
}

interface PhotoSelectorProps {
  photos: Photo[];
  selectedPhotos: string[];
  onToggle: (photoId: string) => void;
}

export function PhotoSelector({
  photos,
  selectedPhotos,
  onToggle,
}: PhotoSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => {
        const isSelected = selectedPhotos.includes(photo.id);
        const canSelect = selectedPhotos.length < 9 || isSelected;

        return (
          <Card
            key={photo.id}
            className={`group relative cursor-pointer overflow-hidden transition-all ${
              isSelected
                ? "ring-primary ring-2"
                : canSelect
                  ? "hover:ring-primary/50 hover:ring-2"
                  : "opacity-50"
            }`}
            onClick={() => canSelect && onToggle(photo.id)}
          >
            <div className="relative aspect-square">
              <img
                src={photo.url}
                alt={photo.originalFilename}
                className="h-full w-full object-cover"
              />
              {isSelected && (
                <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary rounded-full p-2">
                    <Check className="text-primary-foreground h-6 w-6" />
                  </div>
                </div>
              )}
              {!canSelect && !isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-sm font-medium text-white">
                    Max 9 photos
                  </span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
