"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Eye,
  Share2,
  Settings,
  Plus,
  BarChart3,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
  zodResolver,
} from "@/components/ui/form";
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

import { useTRPC } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataProviderEnum, educationLevelEnum } from "@/server/db/schema";
import { ComparisonColumn } from "./comparison-column";

type Comparison = RouterOutputs["profileCompare"]["get"];

interface ComparisonDetailProps {
  comparison: Comparison;
}

const settingsFormSchema = z.object({
  name: z.string().optional(),
  profileName: z.string().optional(),
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
  const [newColumnProvider, setNewColumnProvider] = useState<string>("TINDER");

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: comparison.name || "",
      profileName: comparison.profileName || "",
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
          `Column added successfully! Added ${newColumnProvider.charAt(0) + newColumnProvider.slice(1).toLowerCase()} to your comparison.`,
        );
        void queryClient.invalidateQueries(
          trpc.profileCompare.get.queryOptions({ id: comparison.id }),
        );
        setAddColumnOpen(false);
        setNewColumnProvider("TINDER");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add column");
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

  const updateMutation = useMutation(
    trpc.profileCompare.update.mutationOptions({
      onSuccess: () => {
        toast.success("Settings saved successfully!");
        setSettingsOpen(false);
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
    updateMutation.mutate({
      id: comparison.id,
      name: data.name || undefined,
      profileName: data.profileName || undefined,
      defaultBio: data.defaultBio || undefined,
      heightCm: data.heightCm ? parseInt(data.heightCm, 10) : undefined,
      educationLevel:
        data.educationLevel === "__none__" || !data.educationLevel
          ? undefined
          : (data.educationLevel as
              | (typeof educationLevelEnum.enumValues)[number]
              | undefined),
      city: data.city || undefined,
      state: data.state || undefined,
      country: data.country || undefined,
      nationality: data.nationality || undefined,
      hometown: data.hometown || undefined,
      isPublic: data.isPublic,
    });
  };

  const handleCopyShareLink = () => {
    if (comparison.shareKey) {
      const shareUrl = `${window.location.origin}/share/profile-compare/${comparison.shareKey}`;
      void navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard! Ready to share.");
    }
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
          <Link href={`/app/profile-compare/${comparison.id}/summary`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Summary
            </Button>
          </Link>
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
        </div>
      </div>

      {/* Desktop: Side-by-side columns */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-3">
        {comparison.columns.map((column) => (
          <ComparisonColumn
            key={column.id}
            column={column}
            comparisonId={comparison.id}
            defaultBio={comparison.defaultBio || undefined}
            profileName={comparison.profileName || undefined}
            age={comparison.age || undefined}
          />
        ))}
        {/* Add Column Button */}
        <div className="border-muted-foreground/25 flex items-center justify-center rounded-lg border-2 border-dashed">
          <Button
            variant="ghost"
            onClick={() => setAddColumnOpen(true)}
            className="h-full w-full flex-col gap-2"
          >
            <Plus className="text-muted-foreground h-8 w-8" />
            <span className="text-muted-foreground">Add Column</span>
          </Button>
        </div>
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
                  {column.title || column.dataProvider}
                </TabsTrigger>
              ))}
              <TabsTrigger value="add" className="flex-1">
                <Plus className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            {comparison.columns.map((column) => (
              <TabsContent key={column.id} value={column.id}>
                <ComparisonColumn
                  column={column}
                  comparisonId={comparison.id}
                  defaultBio={comparison.defaultBio || undefined}
                  profileName={comparison.profileName || undefined}
                  age={comparison.age || undefined}
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
                  <span className="text-muted-foreground">Add Column</span>
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
                Add Your First Column
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparison Settings</DialogTitle>
            <DialogDescription>
              Update your comparison name and default bio
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comparison Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Winter 2024 Profile"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Bio</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Bio that applies to all apps (can be overridden per app)"
                        className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 180"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {educationLevelEnum.enumValues.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Oslo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Oslo County" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Norway" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Norwegian" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="hometown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hometown</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Oslo, Norway" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mt-0">
                      Make this comparison public
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
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
          </Form>
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
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/share/profile-compare/${comparison.shareKey}`}
                    className="flex-1"
                  />
                  <Button onClick={handleCopyShareLink} size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Invite Friend to Create Version</Label>
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
                    size="sm"
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
                onClick={() => {
                  updateMutation.mutate(
                    { id: comparison.id, isPublic: true },
                    {
                      onSuccess: () => {
                        toast.success(
                          "Comparison is now public! Share link is ready.",
                        );
                        void queryClient.invalidateQueries(
                          trpc.profileCompare.get.queryOptions({
                            id: comparison.id,
                          }),
                        );
                      },
                    },
                  );
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Make Public
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Add a new column to compare. You can add multiple columns of the
              same app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">Dating App</Label>
              <Select
                value={newColumnProvider}
                onValueChange={setNewColumnProvider}
              >
                <SelectTrigger id="provider">
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddColumnOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddColumn}
              disabled={addColumnMutation.isPending}
            >
              {addColumnMutation.isPending ? "Adding..." : "Add Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
