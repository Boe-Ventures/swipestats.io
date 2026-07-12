"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Layers,
  List,
  Image as ImageIcon,
  GripVertical,
  Pencil,
  MoreVertical,
  CheckCircle2,
  Circle,
  Flame,
  Copy,
  ArrowLeft,
  ArrowRight,
  Download,
  Images,
  FileJson,
} from "lucide-react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteAlert } from "@/components/ui/alert-dialog";
import { RoastCtaStrip } from "@/components/roast/roast-cta-strip";
import { cn } from "@/components/ui/lib/utils";

import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import type { EducationLevel } from "@/server/db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddContentDialog } from "./add-content-dialog";
import { EditContentDialog } from "./edit-content-dialog";
import { RoastProfileDialog } from "./roast-profile-dialog";
import { getProviderConfig, type DisplayMode } from "./provider-config";
import { ProviderIconChip } from "./provider-icon-chip";
import { StackView } from "./stack-view";
import { FlowView } from "./flow-view";
import { isPromptSource } from "@/lib/prompt-bank";
import { downloadFromUrl } from "../_lib/download";

// Local-only developer tools (bulk downloads / export). On Vercel both preview
// and production run a production build, so this is true only under `next dev`.
const isDev = process.env.NODE_ENV === "development";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["get"]["columns"][number];

interface ComparisonColumnProps {
  column: ComparisonColumn;
  comparisonId: string;
  defaultBio?: string;
  profileName?: string;
  age?: number;
  heightCm?: number;
  educationLevel?: EducationLevel;
  hometown?: string;
  city?: string;
  nationality?: string;
  /** Opens the shared photo-library dialog (in place of navigating to /photos). */
  onBrowseLibrary?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMove?: (direction: "left" | "right") => void;
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

  // The tile is both the drag handle and the click-to-edit target. The
  // PointerSensor's distance constraint keeps a plain click from starting a
  // drag, but after a real drag the browser still fires a click on drop —
  // remember the drag so that click doesn't open the edit dialog.
  const wasDragged = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragged.current = true;
  }, [isDragging]);

  const handleClick = () => {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    onEdit(content);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Corner action cluster (edit + delete) and a drag affordance hint. The
  // whole tile already drags and clicks-to-edit; these exist so both actions
  // are *visible*, not just possible. pointer-down must not bubble into the
  // tile's drag listeners, and click must not bubble into click-to-edit.
  const cornerButtonClass =
    "text-foreground grid h-7 w-7 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 disabled:pointer-events-none";

  const actionButtons = (
    <div className="absolute top-1.5 right-1.5 z-[2] flex gap-1">
      <button
        type="button"
        aria-label="Edit"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(content);
        }}
        className={cornerButtonClass}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Remove from profile"
        disabled={isDeleting}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(content.id);
        }}
        className={cn(cornerButtonClass, "hover:text-red-600")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  // Purely visual "you can drag this" hint — the tile itself is the handle.
  const dragHint = (
    <span className="pointer-events-none absolute top-1.5 left-1.5 z-[2] grid h-7 w-7 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
      <GripVertical className="text-foreground h-3.5 w-3.5" />
    </span>
  );

  // Render photo content
  if (content.type === "photo" && content.attachment) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className="group relative aspect-square cursor-pointer touch-none active:cursor-grabbing"
      >
        <Image
          src={content.attachment.url}
          alt={content.caption || `Photo ${index + 1}`}
          fill
          className="rounded-md object-cover"
        />
        {content.caption && (
          <div className="absolute right-0 bottom-0 left-0 bg-black/70 p-2 text-xs text-white">
            {content.caption}
          </div>
        )}
        {/* Subtle hover affordance — the photo stays visible while reordering */}
        <div className="pointer-events-none absolute inset-0 rounded-md transition group-hover:bg-black/10 group-hover:ring-2 group-hover:ring-black/10 group-hover:ring-inset" />
        {dragHint}
        {actionButtons}
      </div>
    );
  }

  // Render prompt content
  if (content.type === "prompt") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className="group bg-card hover:border-foreground/20 relative flex aspect-square cursor-pointer touch-none flex-col overflow-hidden rounded-md border p-3 transition active:cursor-grabbing"
      >
        <p className="text-muted-foreground line-clamp-2 shrink-0 text-[11px] leading-snug font-medium">
          {content.prompt}
        </p>
        <div className="relative mt-1 min-h-0 flex-1 overflow-hidden">
          <p className="text-xs leading-snug">{content.answer}</p>
          {/* Fade the bottom so long answers truncate gracefully instead of
              being sliced mid-line by the square's overflow clip. */}
          <div className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t to-transparent" />
        </div>
        {dragHint}
        {actionButtons}
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
  heightCm,
  educationLevel,
  hometown,
  city,
  nationality,
  onBrowseLibrary,
  canMoveLeft = false,
  canMoveRight = false,
  onMove,
}: ComparisonColumnProps) {
  const [bio, setBio] = useState(column.bio || "");
  const [title, setTitle] = useState(column.title || "");
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false);
  const [roastDialogOpen, setRoastDialogOpen] = useState(false);
  const [editContentDialogOpen, setEditContentDialogOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<
    ComparisonColumn["content"][number] | null
  >(null);
  // Which dev download (if any) is currently running, so the menu items can
  // disable while a zip/export is being prepared.
  const [devDownload, setDevDownload] = useState<
    null | "column" | "library" | "export" | "column-json"
  >(null);

  const isDone = !!column.completedAt;
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

  // Drag & drop sensors. The whole tile is both the drag handle and the
  // click-to-edit target, so a drag only starts after 8px of movement — a
  // plain click stays a click.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  const [deleteColumnConfirmOpen, setDeleteColumnConfirmOpen] = useState(false);

  const removeColumnMutation = useMutation(
    trpc.profileCompare.removeColumn.mutationOptions({
      onSuccess: () => {
        toast.success(`${providerConfig.name} column removed`);
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
        setDeleteColumnConfirmOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove column");
      },
    }),
  );

  const duplicateColumnMutation = useMutation(
    trpc.profileCompare.duplicateColumn.mutationOptions({
      onSuccess: () => {
        toast.success("Profile duplicated — tweak it and compare");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparisonId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to duplicate profile");
      },
    }),
  );

  // Empty columns delete immediately; columns with content require confirmation.
  const handleDeleteColumn = () => {
    if (column.content.length === 0) {
      removeColumnMutation.mutate({ columnId: column.id });
    } else {
      setDeleteColumnConfirmOpen(true);
    }
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setLocalContentOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
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

  // Discard the local reordering and snap back to the saved server order.
  const handleCancelOrder = () => {
    setLocalContentOrder(column.content.map((c) => c.id));
  };

  // Send "" through (rather than coercing to undefined) — the service treats
  // undefined as "leave unchanged", which would make these impossible to clear.
  const handleSaveBio = () => {
    updateColumnMutation.mutate({
      columnId: column.id,
      bio: bio.trim(),
    });
  };

  const handleSaveTitle = () => {
    updateColumnMutation.mutate({
      columnId: column.id,
      title: title.trim(),
    });
  };

  // Dev-only bulk downloads. Each hits a `/api/dev` endpoint that 404s outside
  // local dev, fetches the payload, and triggers a browser download.
  const handleDevDownload = async (
    kind: "column" | "library" | "export" | "column-json",
    url: string,
    fallbackName: string,
  ) => {
    setDevDownload(kind);
    toast.info("Preparing download…");
    try {
      await downloadFromUrl(url, fallbackName);
      toast.success("Download ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDevDownload(null);
    }
  };

  const displayBio = column.bio || defaultBio || "";
  const displayName = column.title || providerConfig.name;

  return (
    <Card>
      <Tabs
        value={displayMode}
        onValueChange={(v) => setDisplayMode(v as DisplayMode)}
      >
        <CardHeader>
          {/* Identity on the left, view toggle + menu right-aligned — same
              layout as the share page header. */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <ProviderIconChip config={providerConfig} done={isDone} />
              <span className="truncate text-base font-semibold">
                {displayName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <TabsList className="hidden h-8 lg:flex">
                <TabsTrigger value="stack" className="text-xs">
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  Stack
                </TabsTrigger>
                <TabsTrigger value="flow" className="text-xs">
                  <List className="mr-1.5 h-3.5 w-3.5" />
                  Flow
                </TabsTrigger>
              </TabsList>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-8 w-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Column options</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setAddContentDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add content
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoastDialogOpen(true)}>
                    <Flame className="mr-2 h-4 w-4 text-rose-500" />
                    Roast this profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      duplicateColumnMutation.mutate({ columnId: column.id })
                    }
                    disabled={duplicateColumnMutation.isPending}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateColumnMutation.mutate({
                        columnId: column.id,
                        completed: !isDone,
                      })
                    }
                  >
                    {isDone ? (
                      <>
                        <Circle className="mr-2 h-4 w-4" />
                        Mark as not done
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as done
                      </>
                    )}
                  </DropdownMenuItem>
                  {onMove && (canMoveLeft || canMoveRight) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onMove("left")}
                        disabled={!canMoveLeft}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Move left
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onMove("right")}
                        disabled={!canMoveRight}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Move right
                      </DropdownMenuItem>
                    </>
                  )}
                  {isDev && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                        Dev tools
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        disabled={devDownload !== null}
                        onClick={() =>
                          void handleDevDownload(
                            "column",
                            `/api/dev/profile-compare/column-photos/${column.id}`,
                            `${displayName}-photos.zip`,
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download column photos (.zip)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={devDownload !== null}
                        onClick={() =>
                          void handleDevDownload(
                            "library",
                            `/api/dev/profile-compare/library`,
                            "swipestats-photo-library.zip",
                          )
                        }
                      >
                        <Images className="mr-2 h-4 w-4" />
                        Download my photo library (.zip)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={devDownload !== null}
                        onClick={() =>
                          void handleDevDownload(
                            "column-json",
                            `/api/dev/profile-compare/export-column/${column.id}`,
                            `${displayName}-export.json`,
                          )
                        }
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        Export this column (.json)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={devDownload !== null}
                        onClick={() =>
                          void handleDevDownload(
                            "export",
                            `/api/dev/profile-compare/export/${comparisonId}`,
                            "comparison-export.json",
                          )
                        }
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        Export whole comparison (.json)
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDeleteColumn}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Compact toggle drops below the identity row on narrow widths */}
          <TabsList className="mt-2 grid h-8 w-full grid-cols-2 lg:hidden">
            <TabsTrigger value="stack" className="text-xs">
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Stack
            </TabsTrigger>
            <TabsTrigger value="flow" className="text-xs">
              <List className="mr-1.5 h-3.5 w-3.5" />
              Flow
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Preview nearly fills the card: -mx-4 against CardContent's px-6
              leaves a tiny 8px breathing margin (the share page is borderless
              and stays fully flush). Done-status now rides the provider chip in
              the header (a green ring) rather than a pill over the preview. */}
          <div className="relative -mx-4">
            <TabsContent value="stack" className="mt-0">
              <StackView
                column={column}
                providerConfig={providerConfig}
                defaultBio={displayBio}
                onAddContent={() => setAddContentDialogOpen(true)}
                onBrowseLibrary={onBrowseLibrary}
                profileName={profileName}
                age={age}
                city={city}
                educationLevel={educationLevel}
                hometown={hometown}
              />
            </TabsContent>

            <TabsContent value="flow" className="mt-0">
              <FlowView
                column={column}
                providerConfig={providerConfig}
                defaultBio={displayBio}
                onAddContent={() => setAddContentDialogOpen(true)}
                onBrowseLibrary={onBrowseLibrary}
                profileName={profileName}
                age={age}
                heightCm={heightCm}
                educationLevel={educationLevel}
                hometown={hometown}
                city={city}
                nationality={nationality}
              />
            </TabsContent>
          </div>

          {/* Roast strip — the roast entry point, surfaced as an insight under
              the preview instead of hiding in the column menu. Once roasted it
              collapses to a single line: the tagline IS the summary; details
              are one tap away in the dialog. */}
          <RoastCtaStrip
            title={
              column.roastStatus.roasted
                ? (column.roastStatus.tagline ?? "Your AI roast")
                : "Roast this profile"
            }
            badge={
              column.roastStatus.roasted
                ? column.roastStatus.tone?.toUpperCase()
                : undefined
            }
            description={
              column.roastStatus.roasted
                ? undefined
                : "Get photo verdicts & a sharper bio"
            }
            onClick={() => setRoastDialogOpen(true)}
          />

          {/* Edit Section Divider — two real line segments with a gap for the
            label, so there's no background box that can stand out against the
            card surface. */}
          <div className="text-muted-foreground flex items-center gap-3 text-xs uppercase">
            <span className="bg-border h-px flex-1" />
            Edit Content
            <span className="bg-border h-px flex-1" />
          </div>
          {/* Content Management */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Manage Content</Label>
              <span className="text-muted-foreground text-xs">
                {column.content.length}{" "}
                {column.content.length === 1 ? "item" : "items"}
                {column.content.length > 1 && " · drag to reorder"}
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
                    {/* Pad the grid with empty "add" slots up to 6 so a sparse
                      profile still reads as a photo grid and invites more. */}
                    {Array.from({
                      length: Math.max(0, 6 - column.content.length),
                    }).map((_, i) => (
                      <button
                        key={`placeholder-${i}`}
                        type="button"
                        onClick={() => setAddContentDialogOpen(true)}
                        aria-label="Add content"
                        className="border-muted-foreground/25 bg-muted/20 text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/40 hover:text-foreground flex aspect-square items-center justify-center rounded-md border border-dashed transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
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

            {/* Save / Cancel Order Buttons */}
            {hasUnsavedOrder && column.content.length > 0 && (
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleSaveOrder}
                  disabled={reorderContentMutation.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {reorderContentMutation.isPending
                    ? "Saving..."
                    : "Save Content Order"}
                </Button>
                <Button
                  onClick={handleCancelOrder}
                  disabled={reorderContentMutation.isPending}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
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

          {/* Column label (stored as `title` in the DB) — overrides the app
              name wherever this column is shown. Low priority, kept at the
              bottom. */}
          <div>
            <Label
              htmlFor={`title-${column.id}`}
              className="mb-2 block text-sm font-medium"
            >
              Column label
            </Label>
            <div className="flex gap-2">
              <input
                id={`title-${column.id}`}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., "Playful bio" or "Variant B"`}
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
                Shown instead of the app name on this column, in tabs, and on
                your shared page. Handy when comparing two versions of the same
                app.
              </p>
            )}
          </div>
        </CardContent>
      </Tabs>

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
        existingPrompts={column.content
          .filter((c) => c.type === "prompt")
          .map((c) => ({
            id: c.id,
            prompt: c.prompt ?? "",
            answer: c.answer ?? "",
          }))}
      />

      {/* Roast Dialog */}
      <RoastProfileDialog
        columnId={column.id}
        comparisonId={comparisonId}
        displayName={displayName}
        photoCount={
          column.content.filter((c) => c.type === "photo" && c.attachment)
            .length
        }
        promptCount={column.content.filter((c) => c.type === "prompt").length}
        hasBio={Boolean(column.bio || defaultBio)}
        onAddContent={() => {
          setRoastDialogOpen(false);
          setAddContentDialogOpen(true);
        }}
        open={roastDialogOpen}
        onOpenChange={setRoastDialogOpen}
      />

      {/* Edit Content Dialog */}
      <EditContentDialog
        open={editContentDialogOpen}
        onOpenChange={setEditContentDialogOpen}
        content={contentToEdit}
        comparisonId={comparisonId}
        currentApp={
          isPromptSource(column.dataProvider) ? column.dataProvider : undefined
        }
        onDelete={(contentId) => deleteContentMutation.mutate({ contentId })}
      />

      {/* Confirm deletion when the column still has content */}
      <DeleteAlert
        open={deleteColumnConfirmOpen}
        onOpenChange={setDeleteColumnConfirmOpen}
        onConfirm={() => removeColumnMutation.mutate({ columnId: column.id })}
        title={`Delete ${providerConfig.name} column?`}
        description={`This permanently removes this column and its ${column.content.length} ${
          column.content.length === 1 ? "item" : "items"
        }. This action cannot be undone.`}
        isLoading={removeColumnMutation.isPending}
      />
    </Card>
  );
}
