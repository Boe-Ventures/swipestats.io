"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Photo {
  id: string;
  url: string;
  originalFilename: string;
}

interface SelectedPhotosGridProps {
  selectedPhotos: string[];
  photos: Photo[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (photoId: string) => void;
  onAddSlot: (index: number) => void;
  maxSlots?: number;
}

function SortablePhoto({
  photo,
  index,
  onRemove,
}: {
  photo: Photo;
  index: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group bg-muted relative aspect-square touch-none overflow-hidden rounded-xl border shadow-sm ${
        isDragging ? "z-10 opacity-70 ring-2 ring-primary" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <Image
        src={photo.url}
        alt={photo.originalFilename}
        fill
        sizes="(max-width: 640px) 50vw, 200px"
        className="object-cover"
      />

      {/* Order badge */}
      <span className="bg-primary text-primary-foreground absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow">
        {index + 1}
      </span>

      {/* Remove */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(photo.id);
        }}
        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove photo"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Drag affordance hint */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-1.5 text-center text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        Drag to reorder
      </span>
    </div>
  );
}

export function SelectedPhotosGrid({
  selectedPhotos,
  photos,
  onReorder,
  onRemove,
  onAddSlot,
  maxSlots = 6,
}: SelectedPhotosGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      onReorder(arrayMove(selectedPhotos, oldIndex, newIndex));
    }
  };

  const emptySlots = Math.max(0, maxSlots - selectedPhotos.length);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-3">
        <SortableContext items={selectedPhotos} strategy={rectSortingStrategy}>
          {selectedPhotoObjects.map((photo, index) => (
            <SortablePhoto
              key={photo.id}
              photo={photo}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>

        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={() => onAddSlot(selectedPhotos.length + i)}
            className="group border-muted-foreground/25 hover:border-primary/60 hover:bg-primary/5 flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
          >
            <Plus className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
            <span className="text-muted-foreground mt-1 text-[11px] font-medium">
              Add
            </span>
          </button>
        ))}
      </div>
    </DndContext>
  );
}
