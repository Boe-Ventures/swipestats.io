"use client";

import { useState, useEffect, useRef } from "react";
import {
  Copy,
  Eye,
  Flame,
  Share2,
  Settings,
  Plus,
  ImagePlus,
  Upload,
  Sparkles,
  Loader2,
  Wand2,
  Images,
} from "lucide-react";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Controller,
  FormProvider,
  useForm,
  zodResolver,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/form-new";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dataProviderEnum, educationLevelEnum } from "@/server/db/schema";
import { ComparisonColumn } from "./comparison-column";
import { getProviderConfig } from "./provider-config";
import { PhotoLibraryDialog } from "./photo-library-dialog";
import { useGalleryUpload } from "../_hooks/useGalleryUpload";
import { getDefaultComparisonName } from "../_lib/default-name";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgrade } from "@/contexts/UpgradeContext";
import {
  COMPOSE_PROVIDER_KEYS,
  type ComposeProvider,
} from "../compose-providers";

type Comparison = RouterOutputs["profileCompare"]["get"];

interface ComparisonDetailProps {
  comparison: Comparison;
}

const settingsFormSchema = z.object({
  name: z.string().optional(),
  profileName: z.string().optional(),
  age: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      "Age must be a positive number",
    ),
  defaultBio: z.string().optional(),
  heightCm: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      "Height must be a positive number",
    ),
  educationLevel: z
    .union([z.literal("__none__"), z.enum(educationLevelEnum.enumValues)])
    .optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  nationality: z.string().optional(),
  hometown: z.string().optional(),
  isPublic: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function ComparisonDetail({ comparison }: ComparisonDetailProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newColumnProvider, setNewColumnProvider] = useState<string>("TINDER");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: comparison.name || "",
      profileName: comparison.profileName || "",
      age: comparison.age?.toString() || "",
      defaultBio: comparison.defaultBio || "",
      heightCm: comparison.heightCm?.toString() || "",
      educationLevel: comparison.educationLevel || "__none__",
      city: comparison.city || "",
      state: comparison.state || "",
      country: comparison.country || "",
      nationality: comparison.nationality || "",
      hometown: comparison.hometown || "",
      isPublic: comparison.isPublic,
    },
  });

  // Reset form when comparison data changes or dialog opens
  useEffect(() => {
    if (settingsOpen) {
      form.reset({
        name: comparison.name || "",
        profileName: comparison.profileName || "",
        age: comparison.age?.toString() || "",
        defaultBio: comparison.defaultBio || "",
        heightCm: comparison.heightCm?.toString() || "",
        educationLevel: comparison.educationLevel || "__none__",
        city: comparison.city || "",
        state: comparison.state || "",
        country: comparison.country || "",
        nationality: comparison.nationality || "",
        hometown: comparison.hometown || "",
        isPublic: comparison.isPublic,
      });
    }
  }, [comparison, settingsOpen, form]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const addColumnMutation = useMutation(
    trpc.profileCompare.addColumn.mutationOptions({
      onSuccess: () => {
        toast.success(
          `Profile added successfully! Added ${newColumnProvider.charAt(0) + newColumnProvider.slice(1).toLowerCase()} to your comparison.`,
        );
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparison.id }),
        );
        setAddColumnOpen(false);
        setNewColumnProvider("TINDER");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add profile");
      },
    }),
  );

  const handleAddColumn = () => {
    addColumnMutation.mutate({
      comparisonId: comparison.id,
      dataProvider:
        newColumnProvider as (typeof dataProviderEnum.enumValues)[number],
    });
  };

  // "Build with AI" in the Add Profile dialog: compose a column straight into
  // THIS comparison (the router takes a comparisonId), so there's no redirect —
  // the dialog closes and the new column appears. Only offered for the apps the
  // composer supports, and gated like the rest of the AI features.
  const { effectiveTier } = useSubscription();
  const { openUpgradeModal } = useUpgrade();
  const isPaid = effectiveTier === "PLUS" || effectiveTier === "ELITE";
  const canCompose = (COMPOSE_PROVIDER_KEYS as readonly string[]).includes(
    newColumnProvider,
  );

  const composeColumnMutation = useMutation(
    trpc.profileCompose.compose.mutationOptions({
      onSuccess: () => {
        toast.success("AI profile added — tweak it however you like");
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparison.id }),
        );
        setAddColumnOpen(false);
        setNewColumnProvider("TINDER");
      },
      onError: (error) => {
        toast.error(error.message || "Couldn't compose a profile");
      },
    }),
  );

  const handleComposeColumn = () => {
    if (!isPaid) {
      openUpgradeModal({ feature: "aiRoast" });
      return;
    }
    composeColumnMutation.mutate({
      provider: newColumnProvider as ComposeProvider,
      comparisonId: comparison.id,
    });
  };

  const getQueryKey = trpc.profileCompare.get.queryOptions({
    id: comparison.id,
  }).queryKey;

  const reorderColumnsMutation = useMutation(
    trpc.profileCompare.reorderColumns.mutationOptions({
      // Optimistically apply the new ordering so the columns move instantly.
      onMutate: async ({ columnOrders }) => {
        await queryClient.cancelQueries({ queryKey: getQueryKey });
        const previous = queryClient.getQueryData<Comparison>(getQueryKey);

        if (previous) {
          const orderById = new Map(
            columnOrders.map((c) => [c.id, c.order] as const),
          );
          const reordered = [...previous.columns]
            .map((col) => ({
              ...col,
              order: orderById.get(col.id) ?? col.order,
            }))
            .sort((a, b) => a.order - b.order);

          queryClient.setQueryData<Comparison>(getQueryKey, {
            ...previous,
            columns: reordered,
          });
        }

        return { previous };
      },
      onError: (error, _vars, context) => {
        // Roll back to the snapshot taken in onMutate.
        if (context?.previous) {
          queryClient.setQueryData(getQueryKey, context.previous);
        }
        toast.error(error.message || "Failed to reorder columns");
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: getQueryKey });
      },
    }),
  );

  // Swap a column with its neighbour and persist the full new ordering.
  const handleMoveColumn = (columnId: string, direction: "left" | "right") => {
    const cols = comparison.columns;
    const index = cols.findIndex((c) => c.id === columnId);
    const target = direction === "left" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= cols.length) return;

    const reordered = [...cols];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);

    reorderColumnsMutation.mutate({
      comparisonId: comparison.id,
      columnOrders: reordered.map((c, i) => ({ id: c.id, order: i })),
    });
  };

  const updateMutation = useMutation(
    trpc.profileCompare.update.mutationOptions({
      // Always refresh affected queries; callers add their own success toast
      // so the message matches the action (saving settings vs publishing).
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparison.id }),
        );
        void queryClient.invalidateQueries(
          trpc.profileCompare.list.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update comparison");
      },
    }),
  );

  const onSubmit = (data: SettingsFormValues) => {
    // Cleared fields are sent as null (= clear in the DB) — undefined would
    // mean "leave unchanged", making it impossible to remove a value.
    updateMutation.mutate(
      {
        id: comparison.id,
        name: data.name?.trim() || null,
        profileName: data.profileName?.trim() || null,
        age: data.age ? parseInt(data.age, 10) : null,
        defaultBio: data.defaultBio?.trim() || null,
        heightCm: data.heightCm ? parseInt(data.heightCm, 10) : null,
        educationLevel:
          data.educationLevel === "__none__" || !data.educationLevel
            ? null
            : data.educationLevel,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        nationality: data.nationality?.trim() || null,
        hometown: data.hometown?.trim() || null,
        isPublic: data.isPublic,
      },
      {
        onSuccess: () => {
          toast.success("Settings saved successfully!");
          setSettingsOpen(false);
        },
      },
    );
  };

  const handleCopyShareLink = () => {
    if (comparison.shareKey) {
      const shareUrl = `${window.location.origin}/share/profile-compare/${comparison.shareKey}`;
      void navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard! Ready to share.");
    }
  };

  // Publish = make the comparison public so it gets a share link. After
  // publishing we open the Share dialog so the link is immediately at hand.
  const handlePublish = () => {
    updateMutation.mutate(
      { id: comparison.id, isPublic: true },
      {
        onSuccess: () => {
          toast.success("Comparison is now public! Share link is ready.");
          setShareOpen(true);
        },
      },
    );
  };

  // The whole comparison is empty when it has profiles but none of them have
  // any content yet — the cue to guide the user to upload photos first.
  const hasNoContent =
    comparison.columns.length > 0 &&
    comparison.columns.every((c) => c.content.length === 0);

  // Offer a one-tap path that seeds this comparison from photos the user
  // already uploaded. Only fetched while the empty state is showing.
  const uploadedProfilesQuery = useQuery(
    trpc.user.getUploadedProfiles.queryOptions(undefined, {
      enabled: hasNoContent,
      refetchOnWindowFocus: false,
    }),
  );
  const seedTinderId = uploadedProfilesQuery.data?.tinder[0]?.tinderId;
  const seedMediaQuery = useQuery(
    trpc.profile.getMedia.queryOptions(
      { tinderId: seedTinderId ?? "" },
      { enabled: hasNoContent && !!seedTinderId, refetchOnWindowFocus: false },
    ),
  );
  const canSeedFromTinder =
    !!seedTinderId && (seedMediaQuery.data ?? []).some((m) => m.url);

  // "Use my uploaded Tinder photos" imports those photos into the shared library
  // only — like the "Upload your photos" button beside it, it doesn't auto-fill
  // the comparison's columns. The user then adds them to each profile.
  const importTinderMutation = useMutation(
    trpc.profileCompare.importTinderMediaToLibrary.mutationOptions({
      onSuccess: (res) => {
        const n = res.photoCount;
        toast.success(
          `Added ${n} Tinder ${n === 1 ? "photo" : "photos"} to your library — now add them to each profile below`,
        );
        // Refresh the library so the per-column picker shows the imported photos.
        void queryClient.invalidateQueries(
          trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Couldn't add your photos");
      },
    }),
  );

  // Empty-state upload is the "get started" path, so uploaded photos should be
  // visible immediately. The shared library is still the source of truth; this
  // just seeds each currently-empty profile column with the new attachment rows.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, isUploading } = useGalleryUpload();
  const addUploadedPhotosMutation = useMutation(
    trpc.profileCompare.addPhotosToColumn.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Couldn't add your photos to profiles");
      },
    }),
  );

  const isSeedingPhotos = isUploading || addUploadedPhotosMutation.isPending;

  const handleEmptyStateUpload = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      const attachments = await uploadFiles(files, { successToast: false });
      if (attachments.length === 0) return;

      const photos = attachments.map((attachment) => ({
        attachmentId: attachment.id,
      }));

      for (const column of comparison.columns) {
        await addUploadedPhotosMutation.mutateAsync({
          columnId: column.id,
          photos,
        });
      }

      void queryClient.invalidateQueries(
        trpc.profileCompare.get.queryOptions({ id: comparison.id }),
      );

      const n = attachments.length;
      toast.success(
        `Added ${n} ${n === 1 ? "photo" : "photos"} to each profile`,
      );
    } catch (error) {
      console.error("Failed to seed uploaded photos:", error);
    }
  };

  const handleEmptyStateFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    // Reset so the same files can be picked again after a failed attempt.
    e.target.value = "";
    void handleEmptyStateUpload(files);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {comparison.name || "Untitled Comparison"}
          </h1>
          {comparison.defaultBio && (
            <p className="text-muted-foreground mt-1 text-sm">
              {comparison.defaultBio.slice(0, 100)}
              {comparison.defaultBio.length > 100 ? "..." : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibraryOpen(true)}
          >
            <Images className="mr-2 h-4 w-4" />
            Photos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          {comparison.isPublic ? (
            <Button size="sm" onClick={handleCopyShareLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={updateMutation.isPending}
            >
              <Eye className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {/* Shared getting-started empty state — uploading photos is step 1 */}
      {hasNoContent && (
        <Empty className="overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/60 shadow-sm">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-14 bg-rose-600 text-white shadow-lg shadow-rose-600/30 [&_svg:not([class*='size-'])]:size-7"
            >
              <ImagePlus />
            </EmptyMedia>
            <EmptyTitle className="text-2xl">
              Add your photos to get started
            </EmptyTitle>
            <EmptyDescription className="text-base">
              Upload your photos to your library, then add the ones you want to
              each profile below — reorder, caption, and tweak per app.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {/* Hidden input driven by the "Upload your photos" button below. */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleEmptyStateFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {/* Fastest path for returning users — pull the photos they already
                  uploaded with Tinder into their library (no re-uploading). */}
              {canSeedFromTinder && seedTinderId && (
                <Button
                  size="lg"
                  className="bg-rose-600 hover:bg-rose-500"
                  onClick={() =>
                    importTinderMutation.mutate({
                      tinderId: seedTinderId,
                    })
                  }
                  disabled={importTinderMutation.isPending}
                >
                  {importTinderMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use my uploaded Tinder photos
                    </>
                  )}
                </Button>
              )}
              <Button
                size="lg"
                variant={canSeedFromTinder ? "outline" : "default"}
                className={
                  canSeedFromTinder
                    ? undefined
                    : "bg-rose-600 hover:bg-rose-500"
                }
                onClick={() => fileInputRef.current?.click()}
                disabled={isSeedingPhotos}
              >
                {isSeedingPhotos ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload your photos
                  </>
                )}
              </Button>
              <Link href="https://www.swipestats.io/upload">
                <Button size="lg" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload your dating data
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-xs">
              {canSeedFromTinder ? (
                "Pulled from a profile you already uploaded — no re-uploading needed."
              ) : (
                <>
                  Photos are all you need to compare. Uploading your Tinder or
                  Hinge data is optional — it unlocks your full dating analytics
                  and imports your photos.{" "}
                  <Link
                    href="https://www.swipestats.io/how-to-request-your-data"
                    className="hover:text-foreground underline underline-offset-2"
                  >
                    How to request your data
                  </Link>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
            >
              Or manage your photo library
            </button>
          </EmptyContent>
        </Empty>
      )}

      {/* Desktop: Side-by-side columns */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-3">
        {comparison.columns.map((column, index) => (
          <ComparisonColumn
            key={column.id}
            column={column}
            comparisonId={comparison.id}
            defaultBio={comparison.defaultBio || undefined}
            profileName={comparison.profileName || undefined}
            age={comparison.age || undefined}
            heightCm={comparison.heightCm || undefined}
            educationLevel={comparison.educationLevel || undefined}
            hometown={comparison.hometown || undefined}
            city={comparison.city || undefined}
            nationality={comparison.nationality || undefined}
            onBrowseLibrary={() => setLibraryOpen(true)}
            canMoveLeft={index > 0}
            canMoveRight={index < comparison.columns.length - 1}
            onMove={(direction) => handleMoveColumn(column.id, direction)}
          />
        ))}
        {/* Add Profile — the whole dashed box is the button so hover/click
            covers the entire area. Doesn't stretch to match tall content
            columns; stays compact, top-aligned, and visible while scrolling. */}
        <Button
          variant="ghost"
          onClick={() => setAddColumnOpen(true)}
          className="border-muted-foreground/25 hover:border-muted-foreground/40 sticky top-6 flex h-auto min-h-[28rem] w-full flex-col items-center justify-center gap-2 self-start rounded-lg border-2 border-dashed"
        >
          <Plus className="text-muted-foreground h-8 w-8" />
          <span className="text-muted-foreground">Add profile</span>
        </Button>
      </div>

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        {comparison.columns.length > 0 ? (
          <Tabs defaultValue={comparison.columns[0]!.id}>
            <TabsList className="w-full">
              {comparison.columns.map((column) => (
                <TabsTrigger
                  key={column.id}
                  value={column.id}
                  className="flex-1"
                >
                  {column.title || getProviderConfig(column.dataProvider).name}
                </TabsTrigger>
              ))}
              <TabsTrigger value="add" className="flex-1">
                <Plus className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            {comparison.columns.map((column, index) => (
              <TabsContent key={column.id} value={column.id}>
                <ComparisonColumn
                  column={column}
                  comparisonId={comparison.id}
                  defaultBio={comparison.defaultBio || undefined}
                  profileName={comparison.profileName || undefined}
                  age={comparison.age || undefined}
                  heightCm={comparison.heightCm || undefined}
                  educationLevel={comparison.educationLevel || undefined}
                  hometown={comparison.hometown || undefined}
                  city={comparison.city || undefined}
                  nationality={comparison.nationality || undefined}
                  onBrowseLibrary={() => setLibraryOpen(true)}
                  canMoveLeft={index > 0}
                  canMoveRight={index < comparison.columns.length - 1}
                  onMove={(direction) => handleMoveColumn(column.id, direction)}
                />
              </TabsContent>
            ))}
            <TabsContent value="add">
              <div className="border-muted-foreground/25 flex items-center justify-center rounded-lg border-2 border-dashed py-12">
                <Button
                  variant="ghost"
                  onClick={() => setAddColumnOpen(true)}
                  className="flex-col gap-2"
                >
                  <Plus className="text-muted-foreground h-8 w-8" />
                  <span className="text-muted-foreground">Add profile</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="border-muted-foreground/25 flex items-center justify-center rounded-lg border-2 border-dashed py-12">
            <Button
              variant="ghost"
              onClick={() => setAddColumnOpen(true)}
              className="flex-col gap-2"
            >
              <Plus className="text-muted-foreground h-8 w-8" />
              <span className="text-muted-foreground">
                Add your first profile
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Photo library — upload, analyze, build an AI draft, see results */}
      <PhotoLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        comparisonId={comparison.id}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparison Settings</DialogTitle>
            <DialogDescription>
              Update your comparison name and default bio
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Comparison name
                    </FieldLabel>
                    <Input
                      placeholder={`e.g., ${getDefaultComparisonName()}`}
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Also the headline on your public share page.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="profileName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Your Name</FieldLabel>
                      <Input
                        placeholder="e.g., John"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="age"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Age</FieldLabel>
                      <Input
                        type="number"
                        placeholder="e.g., 28"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="defaultBio"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Default Bio</FieldLabel>
                    <textarea
                      placeholder="Bio that applies to all apps (can be overridden per app)"
                      className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="heightCm"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Height (cm)</FieldLabel>
                      <Input
                        type="number"
                        placeholder="e.g., 180"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="educationLevel"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Education Level
                      </FieldLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {educationLevelEnum.enumValues.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Current City</FieldLabel>
                      <Input
                        placeholder="e.g., Oslo"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="state"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        State/Province
                      </FieldLabel>
                      <Input
                        placeholder="e.g., Oslo County"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="country"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Current Country
                      </FieldLabel>
                      <Input
                        placeholder="e.g., Norway"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="nationality"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Nationality</FieldLabel>
                      <Input
                        placeholder="e.g., Norwegian"
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="hometown"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Hometown</FieldLabel>
                    <Input
                      placeholder="e.g., Oslo, Norway"
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="isPublic"
                render={({ field, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                    className="flex flex-row items-center gap-2 space-y-0"
                  >
                    <Checkbox
                      id={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldLabel htmlFor={field.name} className="mt-0">
                      Make this comparison public
                    </FieldLabel>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Comparison</DialogTitle>
            <DialogDescription>
              {comparison.isPublic
                ? "Anyone with this link can view your comparison"
                : "Make your comparison public to share it"}
            </DialogDescription>
          </DialogHeader>

          {comparison.isPublic && comparison.shareKey ? (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/share/profile-compare/${comparison.shareKey}`}
                    className="flex-1"
                  />
                  <Button onClick={handleCopyShareLink} size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">
                  Invite Friend to Create Version
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/share/create/${comparison.shareKey}`}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      const createUrl = `${window.location.origin}/share/create/${comparison.shareKey}`;
                      void navigator.clipboard.writeText(createUrl);
                      toast.success("Friend creation link copied!");
                    }}
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Share the first link to get feedback. Share the second link to
                let friends create their own version of your profile.
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-muted-foreground mb-4">
                This comparison is currently private. Make it public to generate
                a share link.
              </p>
              <Button
                onClick={handlePublish}
                disabled={updateMutation.isPending}
              >
                <Eye className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Publishing..." : "Make Public"}
              </Button>
            </div>
          )}

          {/* Roasts publish separately (their own shareKey + page), so neither
              link above includes them — worth a heads-up here. */}
          <div className="flex items-start gap-2 rounded-md border border-rose-200/70 bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-muted-foreground text-sm">
              AI roasts aren&apos;t included in these links. Each profile&apos;s
              roast has its own share link — open the roast to share it.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Profile Dialog */}
      <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add profile</DialogTitle>
            <DialogDescription>
              Add a new profile to compare. You can add multiple profiles of the
              same app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="provider" className="mb-2 block">
                Dating App
              </Label>
              <Select
                value={newColumnProvider}
                onValueChange={(nextValue) =>
                  nextValue !== null && setNewColumnProvider(nextValue)
                }
              >
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataProviderEnum.enumValues.map((app) => (
                    <SelectItem key={app} value={app}>
                      {app.charAt(0) + app.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCompose && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Or let AI build it from your analyzed photos — it picks the
                  best shots, orders them, and drafts a bio and prompts.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddColumnOpen(false)}
              disabled={
                addColumnMutation.isPending || composeColumnMutation.isPending
              }
            >
              Cancel
            </Button>
            {canCompose && (
              <Button
                variant="outline"
                onClick={handleComposeColumn}
                disabled={
                  composeColumnMutation.isPending || addColumnMutation.isPending
                }
              >
                {composeColumnMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Build with AI
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleAddColumn}
              disabled={
                addColumnMutation.isPending || composeColumnMutation.isPending
              }
            >
              {addColumnMutation.isPending ? "Adding..." : "Add profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
