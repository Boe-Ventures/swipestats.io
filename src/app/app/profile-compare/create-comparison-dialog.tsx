"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
  zodResolver,
  FormDescription,
} from "@/components/ui/form";

import { useTRPC } from "@/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataProviderEnum } from "@/server/db/schema";

interface CreateComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_APPS = dataProviderEnum.enumValues;

// Form validation schema
const formSchema = z.object({
  name: z.string().max(255).optional(),
  defaultBio: z.string().optional(),
  columns: z
    .array(z.enum(dataProviderEnum.enumValues))
    .min(1, "Please add at least one column"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateComparisonDialog({
  open,
  onOpenChange,
}: CreateComparisonDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      defaultBio: "",
      columns: ["TINDER", "HINGE"],
    },
  });

  const createMutation = useMutation(
    trpc.profileCompare.create.mutationOptions({
      onSuccess: (newComparison) => {
        toast.success("Comparison created!");
        void queryClient.invalidateQueries(
          trpc.profileCompare.list.queryOptions(),
        );
        form.reset();
        onOpenChange(false);
        // Navigate to detail page
        router.push(`/app/profile-compare/${newComparison.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create comparison");
      },
    }),
  );

  const columns = form.watch("columns");

  const handleAddColumn = () => {
    const currentColumns = form.getValues("columns");
    form.setValue("columns", [...currentColumns, "TINDER"], {
      shouldValidate: true,
    });
  };

  const handleRemoveColumn = (index: number) => {
    const currentColumns = form.getValues("columns");
    form.setValue(
      "columns",
      currentColumns.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };

  const handleChangeColumn = (index: number, app: string) => {
    const currentColumns = form.getValues("columns");
    const newColumns = [...currentColumns];
    newColumns[index] = app as (typeof AVAILABLE_APPS)[number];
    form.setValue("columns", newColumns, { shouldValidate: true });
  };

  const onSubmit = (data: FormValues) => {
    const columnsData = data.columns.map((app) => ({
      dataProvider: app,
      bio: undefined,
    }));

    createMutation.mutate({
      name: data.name || undefined,
      defaultBio: data.defaultBio || undefined,
      columns: columnsData,
    });
  };

  return (
    <SimpleDialog
      title="Create New Comparison"
      description="Compare your dating profiles across different apps"
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) form.reset();
        onOpenChange(isOpen);
      }}
      size="default"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Winter 2024 Profile"
                    {...field}
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Comparison Columns */}
          <FormField
            control={form.control}
            name="columns"
            render={({ field }) => (
              <FormItem>
                <div className="mb-3 flex items-center justify-between">
                  <FormLabel>Comparison Columns</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddColumn}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Column
                  </Button>
                </div>

                <FormControl>
                  <>
                    {columns.length === 0 ? (
                      <div className="bg-muted/50 flex items-center justify-center rounded-lg border border-dashed py-8">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-2 text-sm">
                            No columns yet
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddColumn}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Your First Column
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {columns.map((app, index) => (
                          <div
                            key={index}
                            className="bg-background flex items-center gap-2 rounded-lg border p-2"
                          >
                            <Badge variant="secondary" className="min-w-[80px]">
                              Column {index + 1}
                            </Badge>
                            <Select
                              value={app}
                              onValueChange={(value) =>
                                handleChangeColumn(index, value)
                              }
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_APPS.map((availableApp) => (
                                  <SelectItem
                                    key={availableApp}
                                    value={availableApp}
                                  >
                                    {availableApp.charAt(0) +
                                      availableApp.slice(1).toLowerCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {columns.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveColumn(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                </FormControl>
                <FormDescription>
                  You can add multiple columns of the same app (e.g., multiple
                  Tinder profiles)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Default Bio */}
          <FormField
            control={form.control}
            name="defaultBio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Bio (optional)</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="A bio that applies to all apps (you can customize per app later)"
                    className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Comparison"}
            </Button>
          </div>
        </form>
      </Form>
    </SimpleDialog>
  );
}
