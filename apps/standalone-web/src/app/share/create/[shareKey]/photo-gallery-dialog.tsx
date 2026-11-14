"use client";

import Image from "next/image";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  // Toggle without closing so the gallery works as a multi-select browser.
  const handlePhotoClick = (photoId: string) => {
    onSelect(photoId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choose photos</DialogTitle>
          <DialogDescription>
            Tap to add or remove. {selectedPhotos.length}/{maxSelectable}{" "}
            selected.
          </DialogDescription>
        </DialogHeader>
        <div className="-mr-2 grid flex-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.includes(photo.id);
            const order = selectedPhotos.indexOf(photo.id) + 1;
            const canSelect =
              selectedPhotos.length < maxSelectable || isSelected;

            return (
              <button
                key={photo.id}
                type="button"
                disabled={!canSelect}
                className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-primary ring-2"
                    : canSelect
                      ? "border-border/40 hover:border-primary/50"
                      : "border-border/40 cursor-not-allowed opacity-50"
                }`}
                onClick={() => canSelect && handlePhotoClick(photo.id)}
              >
                <Image
                  src={photo.url}
                  alt={photo.originalFilename}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
                {isSelected ? (
                  <div className="bg-primary/20 absolute inset-0 flex items-center justify-center">
                    <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow">
                      {order}
                    </span>
                  </div>
                ) : (
                  <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
                {!canSelect && !isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-sm font-medium text-white">
                      Max {maxSelectable}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {selectedPhotos.length}/{maxSelectable} selected
          </span>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
