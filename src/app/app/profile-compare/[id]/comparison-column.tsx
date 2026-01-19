"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Layers,
  List,
  Smartphone,
  Image as ImageIcon,
  GripVertical,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddContentDialog } from "./add-content-dialog";
import { EditContentDialog } from "./edit-content-dialog";
import { getProviderConfig, type DisplayMode } from "./provider-config";
import { StackView } from "./stack-view";
import { FlowView } from "./flow-view";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["get"]["columns"][number];

interface ComparisonColumnProps {
  column: ComparisonColumn;
  comparisonId: string;
  defaultBio?: string;
  profileName?: string;
  age?: number;
}

// Sortable Content Component (photos and prompts)
interface SortableContentProps {
  content: ComparisonColumn["content"][number];
  index: number;
  onDelete: (contentId: string) => void;
  onEdit: (content: ComparisonColumn["content"][number]) => void;
  isDeleting: boolean;
}

function SortableContent({
  content,
  index,
  onDelete,
  onEdit,
  isDeleting,
}: SortableContentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: content.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Render photo content
  if (content.type === "photo" && content.attachment) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group relative aspect-square"
      >
        <img
          src={content.attachment.url}
          alt={content.caption || `Photo ${index + 1}`}
          className="h-full w-full rounded-md object-cover"
        />
        {content.caption && (
          <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-xs text-white">
            {content.caption}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab rounded bg-white/90 p-1.5 shadow-sm active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Action Buttons */}
          <div className="flex gap-1">
            {/* Edit Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(content)}
            >
              <Pencil className="h-3 w-3" />
            </Button>

            {/* Delete Button */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(content.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render prompt content
  if (content.type === "prompt") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="group bg-card relative rounded-md border p-4"
      >
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">
            {content.prompt}
          </p>
          <p className="text-sm">{content.answer}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab rounded bg-white/90 p-1.5 shadow-sm active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Action Buttons */}
          <div className="flex gap-1">
            {/* Edit Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(content)}
            >
              <Pencil className="h-3 w-3" />
            </Button>

            {/* Delete Button */}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(content.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function ComparisonColumn({
  column,
  comparisonId,
  defaultBio,
  profileName,
  age,
}: ComparisonColumnProps) {
  const [bio, setBio] = useState(column.bio || "");
  const [title, setTitle] = useState(column.title || "");
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false);
  const [editContentDialogOpen, setEditContentDialogOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<
    ComparisonColumn["content"][number] | null
  >(null);

  const providerConfig = getProviderConfig(column.dataProvider);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    providerConfig.defaultDisplayMode,
  );

  // Local content order state for drag & drop
  const [localContentOrder, setLocalContentOrder] = useState<string[]>(
    column.content.map((c) => c.id),
  );

  // Sync local order when server data changes
  useEffect(() => {
    setLocalContentOrder(column.content.map((c) => c.id));
  }, [column.content]);

  // Check if order has changed
  const hasUnsavedOrder =
    JSON.stringify(localContentOrder) !==
    JSON.stringify(column.content.map((c) => c.id));

  // Sort content by local order
  const sortedContent = [...column.content].sort((a, b) => {
    const indexA = localContentOrder.indexOf(a.id);
    const indexB = localContentOrder.indexOf(b.id);
    return indexA - indexB;
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateColumnMutation = useMutation(
    trpc.profileCompare.updateColumn.mutationOptions({
      onSuccess: () => {
        toast.success("Column updated");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update column");
      },
    }),
  );

  const deleteContentMutation = useMutation(
    trpc.profileCompare.deleteContent.mutationOptions({
      onSuccess: () => {
        toast.success("Content removed");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove content");
      },
    }),
  );

  const reorderContentMutation = useMutation(
    trpc.profileCompare.reorderContent.mutationOptions({
      onSuccess: () => {
        toast.success("Content order saved");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save content order");
      },
    }),
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setLocalContentOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSaveOrder = () => {
    reorderContentMutation.mutate({
      columnId: column.id,
      contentOrders: localContentOrder.map((id, index) => ({
        id,
        order: index,
      })),
    });
  };

  const handleSaveBio = () => {
    updateColumnMutation.mutate({
      columnId: column.id,
      bio: bio || undefined,
    });
  };

  const handleSaveTitle = () => {
    updateColumnMutation.mutate({
      columnId: column.id,
      title: title || undefined,
    });
  };

  const displayBio = column.bio || defaultBio || "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge
              variant="secondary"
              style={{
                backgroundColor: `${providerConfig.brandColor}22`,
                color: providerConfig.brandColor,
                borderColor: `${providerConfig.brandColor}44`,
              }}
            >
              {column.title || column.dataProvider}
            </Badge>
          </CardTitle>
        </div>
        <CardDescription>
          {column.content.length}{" "}
          {column.content.length === 1 ? "item" : "items"}
          {column.title && (
            <span className="text-muted-foreground ml-1">
              • {column.dataProvider}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Display Mode Selector */}
        <div>
          <Label className="mb-2 block text-sm font-medium">View Mode</Label>
          <Tabs
            value={displayMode}
            onValueChange={(v) => setDisplayMode(v as DisplayMode)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stack" className="text-xs">
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Stack
              </TabsTrigger>
              <TabsTrigger value="flow" className="text-xs">
                <List className="mr-1.5 h-3.5 w-3.5" />
                Flow
              </TabsTrigger>
              <TabsTrigger value="platform" disabled className="text-xs">
                <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                Platform
              </TabsTrigger>
            </TabsList>

            {/* Stack View */}
            <TabsContent value="stack" className="mt-4">
              <StackView
                column={column}
                providerConfig={providerConfig}
                defaultBio={displayBio}
                onAddContent={() => setAddContentDialogOpen(true)}
                profileName={profileName}
                age={age}
              />
            </TabsContent>

            {/* Flow View */}
            <TabsContent value="flow" className="mt-4">
              <FlowView
                column={column}
                providerConfig={providerConfig}
                defaultBio={displayBio}
                onAddContent={() => setAddContentDialogOpen(true)}
                profileName={profileName}
                age={age}
              />
            </TabsContent>

            {/* Platform View (V3) */}
            <TabsContent value="platform" className="mt-4">
              <div className="bg-muted/50 flex aspect-[9/16] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                <Smartphone className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground mb-2 font-medium">
                  Platform View
                </p>
                <p className="text-muted-foreground text-sm">
                  Pixel-perfect {providerConfig.name} UI recreation coming soon
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Section Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Edit Content
            </span>
          </div>
        </div>
        {/* Content Management */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-medium">Manage Content</Label>
            <span className="text-muted-foreground text-xs">
              {column.content.length}{" "}
              {column.content.length === 1 ? "item" : "items"}
            </span>
          </div>
          {column.content.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localContentOrder}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-3 gap-2">
                  {sortedContent.map((content, index) => (
                    <SortableContent
                      key={content.id}
                      content={content}
                      index={index}
                      onDelete={(contentId) =>
                        deleteContentMutation.mutate({ contentId })
                      }
                      onEdit={(content) => {
                        setContentToEdit(content);
                        setEditContentDialogOpen(true);
                      }}
                      isDeleting={deleteContentMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <button
              onClick={() => setAddContentDialogOpen(true)}
              className="bg-muted/20 hover:bg-muted/30 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed py-6 transition-colors"
            >
              <ImageIcon className="text-muted-foreground h-6 w-6" />
              <p className="text-muted-foreground text-sm font-medium">
                No content yet
              </p>
              <p className="text-muted-foreground text-xs">
                Click to add photos or prompts
              </p>
            </button>
          )}

          {/* Save Order Button */}
          {hasUnsavedOrder && column.content.length > 0 && (
            <Button
              onClick={handleSaveOrder}
              disabled={reorderContentMutation.isPending}
              size="sm"
              className="mt-3 w-full"
            >
              {reorderContentMutation.isPending
                ? "Saving..."
                : "Save Content Order"}
            </Button>
          )}
        </div>

        {/* Title */}
        <div>
          <Label
            htmlFor={`title-${column.id}`}
            className="mb-2 block text-sm font-medium"
          >
            Title
          </Label>
          <div className="flex gap-2">
            <input
              id={`title-${column.id}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., "2023 Profile" or "Summer Edition"`}
              className="border-input bg-background flex-1 rounded-md border px-3 py-2 text-sm"
            />
            {title !== (column.title || "") && (
              <Button
                size="sm"
                onClick={handleSaveTitle}
                disabled={updateColumnMutation.isPending}
              >
                {updateColumnMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
          {!title && (
            <p className="text-muted-foreground mt-1 text-xs">
              Add a title to identify this version (e.g., "2023", "Summer
              Edition")
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <Label
            htmlFor={`bio-${column.id}`}
            className="mb-2 block text-sm font-medium"
          >
            Bio
          </Label>
          <textarea
            id={`bio-${column.id}`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={defaultBio || "Enter bio for this app..."}
            className="border-input bg-background min-h-32 w-full rounded-md border px-3 py-2 text-sm"
          />
          {bio !== (column.bio || "") && (
            <Button
              size="sm"
              onClick={handleSaveBio}
              disabled={updateColumnMutation.isPending}
              className="mt-2"
            >
              {updateColumnMutation.isPending ? "Saving..." : "Save Bio"}
            </Button>
          )}
          {!column.bio && defaultBio && (
            <p className="text-muted-foreground mt-1 text-xs">
              Using default bio
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setAddContentDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </CardFooter>

      {/* Add Content Dialog */}
      <AddContentDialog
        open={addContentDialogOpen}
        onOpenChange={setAddContentDialogOpen}
        columnId={column.id}
        comparisonId={comparisonId}
        appName={column.dataProvider}
      />

      {/* Edit Content Dialog */}
      <EditContentDialog
        open={editContentDialogOpen}
        onOpenChange={setEditContentDialogOpen}
        content={contentToEdit}
        comparisonId={comparisonId}
      />
    </Card>
  );
}
