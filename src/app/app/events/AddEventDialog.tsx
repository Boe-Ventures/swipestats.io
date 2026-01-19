"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  Plane,
  Heart,
  MapPin,
  Sparkles,
  Users,
  Briefcase,
  GraduationCap,
  Camera,
  ImagePlus,
  Crown,
  FileText,
  Activity,
  Flame,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

import type { EventType, Event } from "@/server/db/schema";
import { eventTypeEnum } from "@/server/db/schema";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/form";
import { DatePickerField } from "@/components/ui/form-inputs/DatePickerField";
import { RadioGroupCardsField } from "@/components/ui/form-inputs/RadioGroupCardsField";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEventId?: string; // Optional: open in edit mode for specific event
}

// Top 4 most useful event types
export const topEventTypes = [
  {
    value: "TRIP" as EventType,
    label: "Trip",
    description: "Travel or vacation",
    icon: <Plane className="h-4 w-4" />,
  },
  {
    value: "RELATIONSHIP" as EventType,
    label: "Relationship",
    description: "Started dating someone",
    icon: <Heart className="h-4 w-4" />,
  },
  {
    value: "NEW_LOCATION" as EventType,
    label: "New Location",
    description: "Moved to a new city",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    value: "CUSTOM" as EventType,
    label: "Custom Event",
    description: "Something else",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

// Additional event types
export const moreEventTypes = [
  {
    value: "FRIENDS_WITH_BENEFITS" as EventType,
    label: "Friends with Benefits",
    description: "Casual relationship",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "NEW_JOB" as EventType,
    label: "New Job",
    description: "Career change",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: "GRADUATION" as EventType,
    label: "Graduation",
    description: "Completed studies",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: "NEW_PHOTOS" as EventType,
    label: "New Photos",
    description: "Updated your photos",
    icon: <Camera className="h-4 w-4" />,
  },
  {
    value: "NEW_FIRST_PHOTO" as EventType,
    label: "New First Photo",
    description: "Changed main photo",
    icon: <ImagePlus className="h-4 w-4" />,
  },
  {
    value: "SUBSCRIPTION" as EventType,
    label: "Subscription",
    description: "Got premium features",
    icon: <Crown className="h-4 w-4" />,
  },
  {
    value: "NEW_BIO" as EventType,
    label: "New Bio",
    description: "Updated profile bio",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: "JOINED_SWIPESTATS" as EventType,
    label: "Joined SwipeStats",
    description: "Started tracking stats",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    value: "JOINED_TINDER" as EventType,
    label: "Joined Tinder",
    description: "Created Tinder account",
    icon: <Flame className="h-4 w-4" />,
  },
  {
    value: "JOINED_HINGE" as EventType,
    label: "Joined Hinge",
    description: "Created Hinge account",
    icon: <Heart className="h-4 w-4" />,
  },
];

// Event types that typically have an end date
export const eventTypesWithEndDate = new Set<EventType>([
  "TRIP",
  "SUBSCRIPTION",
  "FRIENDS_WITH_BENEFITS",
  "RELATIONSHIP",
]);

// Event type name mappings
export const getEventNameFromType = (type: EventType): string => {
  const nameMap: Record<EventType, string> = {
    TRIP: "Trip to",
    RELATIONSHIP: "Relationship with",
    NEW_LOCATION: "Moved to",
    FRIENDS_WITH_BENEFITS: "Friends with benefits with",
    NEW_JOB: "New job at",
    GRADUATION: "Graduated from",
    NEW_PHOTOS: "New Photos",
    NEW_FIRST_PHOTO: "New First Photo",
    SUBSCRIPTION: "Subscription",
    NEW_BIO: "New Bio",
    JOINED_SWIPESTATS: "Joined SwipeStats",
    JOINED_TINDER: "Joined Tinder",
    JOINED_HINGE: "Joined Hinge",
    CUSTOM: "",
  };
  return nameMap[type] || "";
};

export const getEventIcon = (type: EventType) => {
  const iconMap: Record<EventType, React.ReactNode> = {
    TRIP: <Plane className="h-4 w-4" />,
    RELATIONSHIP: <Heart className="h-4 w-4" />,
    NEW_LOCATION: <MapPin className="h-4 w-4" />,
    CUSTOM: <Sparkles className="h-4 w-4" />,
    FRIENDS_WITH_BENEFITS: <Users className="h-4 w-4" />,
    NEW_JOB: <Briefcase className="h-4 w-4" />,
    GRADUATION: <GraduationCap className="h-4 w-4" />,
    NEW_PHOTOS: <Camera className="h-4 w-4" />,
    NEW_FIRST_PHOTO: <ImagePlus className="h-4 w-4" />,
    SUBSCRIPTION: <Crown className="h-4 w-4" />,
    NEW_BIO: <FileText className="h-4 w-4" />,
    JOINED_SWIPESTATS: <Activity className="h-4 w-4" />,
    JOINED_TINDER: <Flame className="h-4 w-4" />,
    JOINED_HINGE: <Heart className="h-4 w-4" />,
  };
  return iconMap[type] || <Calendar className="h-4 w-4" />;
};

export const getEventTypeLabel = (type: EventType) => {
  const allTypes = [...topEventTypes, ...moreEventTypes];
  return allTypes.find((t) => t.value === type)?.label || type;
};

export function AddEventDialog({
  open,
  onOpenChange,
  initialEventId,
}: AddEventDialogProps) {
  const [showAllEventTypes, setShowAllEventTypes] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Form validation schema
  const formSchema = z
    .object({
      name: z.string().min(1, "Event name is required").max(255),
      type: z.enum(eventTypeEnum.enumValues),
      startDate: z.date(),
      hasEndDate: z.boolean(),
      endDate: z.date().optional(),
    })
    .refine(
      (data) => {
        if (data.hasEndDate && data.endDate && data.endDate < data.startDate) {
          return false;
        }
        return true;
      },
      {
        message: "End date must be after start date",
        path: ["endDate"],
      },
    );

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "TRIP",
      startDate: new Date(),
      hasEndDate: false,
      endDate: undefined,
    },
  });

  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
    }),
  );

  const createEventMutation = useMutation(
    trpc.event.create.mutationOptions({
      onSuccess: () => {
        toast.success("Event created successfully");
        form.reset();
        setViewMode("list");
        void queryClient.invalidateQueries({
          queryKey: [["event", "list"]],
          exact: false,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create event");
      },
    }),
  );

  const updateEventMutation = useMutation(
    trpc.event.update.mutationOptions({
      onSuccess: () => {
        toast.success("Event updated successfully");
        form.reset();
        setEditingEvent(null);
        setViewMode("list");
        void queryClient.invalidateQueries({
          queryKey: [["event", "list"]],
          exact: false,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update event");
      },
    }),
  );

  const deleteEventMutation = useMutation(
    trpc.event.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Event deleted successfully");
        void queryClient.invalidateQueries({
          queryKey: [["event", "list"]],
          exact: false,
        });
      },
      onError: () => {
        toast.error("Failed to delete event");
      },
    }),
  );

  const onSubmit = (data: FormValues) => {
    if (editingEvent) {
      updateEventMutation.mutate({
        id: editingEvent.id,
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.hasEndDate ? data.endDate : null,
      });
    } else {
      createEventMutation.mutate({
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.hasEndDate ? data.endDate : undefined,
      });
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setViewMode("form");
    form.reset({
      name: event.name,
      type: event.type,
      startDate: new Date(event.startDate),
      hasEndDate: !!event.endDate,
      endDate: event.endDate ? new Date(event.endDate) : undefined,
    });
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate({ id: eventToDelete });
      setEventToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setEditingEvent(null);
      setShowAllEventTypes(false);
      setViewMode("list");
    }
    onOpenChange(isOpen);
  };

  const handleAddNewClick = () => {
    setEditingEvent(null);
    form.reset();
    setViewMode("form");
  };

  const handleCancelForm = () => {
    form.reset();
    setEditingEvent(null);
    setViewMode("list");
  };

  const hasEndDate = form.watch("hasEndDate");
  const currentType = form.watch("type");

  // Auto-set hasEndDate and name when event type changes
  useEffect(() => {
    if (currentType && !editingEvent) {
      const shouldHaveEndDate = eventTypesWithEndDate.has(currentType);
      form.setValue("hasEndDate", shouldHaveEndDate);

      const autoName = getEventNameFromType(currentType);
      form.setValue("name", autoName);
    }
  }, [currentType, form, editingEvent]);

  // Handle initialEventId prop
  useEffect(() => {
    if (initialEventId && eventsQuery.data) {
      const event = eventsQuery.data.find((e) => e.id === initialEventId);
      if (event) {
        handleEdit(event);
      }
    }
  }, [initialEventId, eventsQuery.data]);

  const eventCount = eventsQuery.data?.length ?? 0;
  const showList = viewMode === "list" && eventCount > 0;
  const showForm = viewMode === "form";

  return (
    <>
      <SimpleDialog
        open={open}
        onOpenChange={handleDialogClose}
        title={editingEvent ? "Edit Life Event" : "Life Events"}
        description={
          editingEvent
            ? "Update your event details"
            : "Track important moments and milestones that shaped your dating journey"
        }
        size="lg"
        scrollable={true}
      >
        <div className="space-y-6">
          {/* List View */}
          {showList && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Your Events</h3>
                <Button
                  size="sm"
                  onClick={handleAddNewClick}
                  disabled={
                    createEventMutation.isPending ||
                    updateEventMutation.isPending
                  }
                >
                  Add New
                </Button>
              </div>
              <ScrollArea
                className={`rounded-md border p-3 ${eventCount > 3 ? "max-h-[400px]" : ""}`}
              >
                <div className="space-y-2">
                  {eventsQuery.data
                    ?.sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground">
                            {getEventIcon(event.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{event.name}</p>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span>{getEventTypeLabel(event.type)}</span>
                              <span>•</span>
                              <span>
                                {format(
                                  new Date(event.startDate),
                                  "MMM d, yyyy",
                                )}
                              </span>
                              {event.endDate && (
                                <>
                                  <span>-</span>
                                  <span>
                                    {format(
                                      new Date(event.endDate),
                                      "MMM d, yyyy",
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(event.id)}
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty State */}
          {viewMode === "list" && eventCount === 0 && (
            <div className="py-8 text-center">
              <Calendar className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No events yet</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Track important moments that shaped your dating journey
              </p>
              <Button onClick={handleAddNewClick}>Add Your First Event</Button>
            </div>
          )}

          {/* Form View */}
          {showForm && (
            <>
              {eventCount > 0 && <Separator />}
              <div>
                <h3 className="mb-4 text-sm font-semibold">
                  {editingEvent ? "Edit Event" : "Add New Event"}
                </h3>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {/* Event Type */}
                    <div className="space-y-3">
                      <RadioGroupCardsField
                        control={form.control}
                        name="type"
                        label="Event Type"
                        options={topEventTypes}
                        layout="grid"
                        gridCols={2}
                      />

                      <Collapsible
                        open={showAllEventTypes}
                        onOpenChange={setShowAllEventTypes}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                          >
                            {showAllEventTypes
                              ? "Show less"
                              : "Show more event types"}
                            <ChevronDown
                              className={`ml-2 h-4 w-4 transition-transform ${showAllEventTypes ? "rotate-180" : ""}`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <RadioGroupCardsField
                            control={form.control}
                            name="type"
                            options={moreEventTypes}
                            layout="grid"
                            gridCols={2}
                            className="mt-0"
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Event Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Trip to Colombia"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Start Date */}
                    <DatePickerField
                      control={form.control}
                      name="startDate"
                      label="Start Date"
                      placeholder="Pick a date"
                      required
                      captionLayout="dropdown"
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 5}
                    />

                    {/* End Date Toggle & Input */}
                    <FormField
                      control={form.control}
                      name="hasEndDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer font-normal">
                              This event has an end date
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {hasEndDate && (
                      <DatePickerField
                        control={form.control}
                        name="endDate"
                        label="End Date"
                        placeholder="Pick an end date"
                        captionLayout="dropdown"
                        fromYear={1990}
                        toYear={new Date().getFullYear() + 5}
                        disabledDates={(date) => {
                          const startDate = form.getValues("startDate");
                          return startDate ? date < startDate : false;
                        }}
                      />
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelForm}
                        disabled={
                          createEventMutation.isPending ||
                          updateEventMutation.isPending
                        }
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          createEventMutation.isPending ||
                          updateEventMutation.isPending
                        }
                      >
                        {createEventMutation.isPending ||
                        updateEventMutation.isPending
                          ? editingEvent
                            ? "Saving..."
                            : "Creating..."
                          : editingEvent
                            ? "Save Changes"
                            : "Create Event"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </>
          )}
        </div>
      </SimpleDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
