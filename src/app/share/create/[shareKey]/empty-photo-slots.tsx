"use client";

import { Plus } from "lucide-react";

import { Card } from "@/components/ui/card";

interface EmptyPhotoSlotsProps {
  selectedCount: number;
  maxSlots: number;
  onSlotClick: (index: number) => void;
}

export function EmptyPhotoSlots({
  selectedCount,
  maxSlots,
  onSlotClick,
}: EmptyPhotoSlotsProps) {
  // Always show exactly 6 placeholder slots
  const slotsToShow = 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Your Version ({selectedCount}/{maxSlots} photos)
        </h3>
        <p className="text-muted-foreground text-xs">
          Tap a slot to add a photo
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: slotsToShow }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            className="group hover:border-primary/50 relative cursor-pointer border-2 border-dashed transition-all"
            onClick={() => onSlotClick(index)}
          >
            <div className="flex aspect-square items-center justify-center">
              <div className="text-center">
                <Plus className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <span className="text-muted-foreground text-xs">Add Photo</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
