"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface Photo {
  id: string;
  url: string;
  originalFilename: string;
}

interface PhotoGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: Photo[];
  selectedPhotos: string[];
  onSelect: (photoId: string) => void;
  maxSelectable?: number;
}

export function PhotoGalleryDialog({
  open,
  onOpenChange,
  photos,
  selectedPhotos,
  onSelect,
  maxSelectable = 6,
}: PhotoGalleryDialogProps) {
  const handlePhotoClick = (photoId: string) => {
    onSelect(photoId);
    // Close dialog after selection
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a Photo</DialogTitle>
          <DialogDescription>
            Choose a photo to add to your version ({selectedPhotos.length}/
            {maxSelectable} selected)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.includes(photo.id);
            const canSelect =
              selectedPhotos.length < maxSelectable || isSelected;

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
                onClick={() => canSelect && handlePhotoClick(photo.id)}
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.url}
                    alt={photo.originalFilename}
                    fill
                    className="object-cover"
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
                        Max {maxSelectable} photos
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
