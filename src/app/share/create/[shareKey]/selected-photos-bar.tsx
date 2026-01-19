"use client";

import { X, GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Photo {
  id: string;
  url: string;
  originalFilename: string;
}

interface SelectedPhotosBarProps {
  selectedPhotos: string[];
  photos: Photo[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (photoId: string) => void;
  onSlotClick?: (index: number) => void;
  maxSlots?: number;
}

interface SortablePhotoProps {
  photo: Photo;
  onRemove: (photoId: string) => void;
  index: number;
}

function SortablePhoto({ photo, onRemove, index }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-4 rounded-lg border p-4 shadow-sm"
    >
      {/* Drag Handle - Always Visible */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none transition-colors active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Number Badge */}
      <div className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm">
        {index + 1}
      </div>

      {/* Photo Thumbnail - Larger */}
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border shadow-sm">
        <img
          src={photo.url}
          alt={photo.originalFilename}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Spacer to push remove button to the right */}
      <div className="flex-1" />

      {/* Remove Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRemove(photo.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SelectedPhotosBar({
  selectedPhotos,
  photos,
  onReorder,
  onRemove,
  onSlotClick,
  maxSlots = 6,
}: SelectedPhotosBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedPhotoObjects = selectedPhotos
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is Photo => p !== undefined);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedPhotos.indexOf(active.id as string);
      const newIndex = selectedPhotos.indexOf(over.id as string);

      const newOrder = arrayMove(selectedPhotos, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const emptySlots = Math.max(0, maxSlots - selectedPhotos.length);
  const isFull = selectedPhotos.length >= maxSlots;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Your Version ({selectedPhotos.length}/{maxSlots} photos)
        </h3>
        <p className="text-muted-foreground text-xs">
          {selectedPhotos.length > 0 && "Drag to reorder • "}Tap to add • Click
          X to remove
        </p>
      </div>

      {/* Selected Photos List */}
      {selectedPhotoObjects.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedPhotos}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {selectedPhotoObjects.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onRemove={onRemove}
                  index={index}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty Slots */}
      {emptySlots > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: emptySlots }).map((_, index) => (
            <Card
              key={`empty-${index}`}
              className="group hover:border-primary/50 hover:bg-muted/50 relative cursor-pointer border-2 border-dashed transition-all"
              onClick={() => onSlotClick?.(selectedPhotos.length + index)}
            >
              <div className="flex aspect-square items-center justify-center p-4">
                <div className="text-center">
                  <Plus className="text-muted-foreground group-hover:text-primary mx-auto mb-2 h-10 w-10 transition-colors" />
                  <span className="text-muted-foreground text-xs font-medium">
                    Add Photo
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isFull && (
        <div className="pt-2 text-center">
          <button
            onClick={() => onSlotClick?.(selectedPhotos.length)}
            className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
          >
            Add more photos (max {maxSlots})
          </button>
        </div>
      )}
    </div>
  );
}
