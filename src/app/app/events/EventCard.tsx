"use client";

import { useState } from "react";
import {
  Calendar,
  Heart,
  Briefcase,
  GraduationCap,
  MapPin,
  Camera,
  User,
  Plane,
  Home,
  Star,
  Edit2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

import type { EventType } from "@/server/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    type: EventType;
    startDate: Date;
    endDate: Date | null;
    location?: {
      country: string;
      locality: string;
    } | null;
  };
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

// Map event types to icons and colors
const eventTypeConfig: Record<
  EventType,
  { icon: typeof Calendar; label: string; color: string }
> = {
  TRIP: { icon: Plane, label: "Trip", color: "bg-blue-500" },
  RELATIONSHIP: { icon: Heart, label: "Relationship", color: "bg-red-500" },
  FRIENDS_WITH_BENEFITS: {
    icon: Heart,
    label: "Friends with Benefits",
    color: "bg-pink-500",
  },
  NEW_JOB: { icon: Briefcase, label: "New Job", color: "bg-green-500" },
  GRADUATION: {
    icon: GraduationCap,
    label: "Graduation",
    color: "bg-purple-500",
  },
  NEW_LOCATION: { icon: MapPin, label: "New Location", color: "bg-orange-500" },
  NEW_PHOTOS: { icon: Camera, label: "New Photos", color: "bg-indigo-500" },
  NEW_FIRST_PHOTO: {
    icon: Camera,
    label: "New First Photo",
    color: "bg-indigo-600",
  },
  SUBSCRIPTION: { icon: Star, label: "Subscription", color: "bg-yellow-500" },
  NEW_BIO: { icon: User, label: "New Bio", color: "bg-teal-500" },
  JOINED_SWIPESTATS: {
    icon: Star,
    label: "Joined SwipeStats",
    color: "bg-violet-500",
  },
  JOINED_TINDER: { icon: Home, label: "Joined Tinder", color: "bg-rose-500" },
  JOINED_HINGE: { icon: Home, label: "Joined Hinge", color: "bg-amber-500" },
  CUSTOM: { icon: Calendar, label: "Custom Event", color: "bg-gray-500" },
};

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;

  // Calculate duration
  const duration = event.endDate
    ? differenceInDays(event.endDate, event.startDate) + 1
    : null;

  // Format dates
  const startDateStr = format(event.startDate, "MMM d, yyyy");
  const endDateStr = event.endDate
    ? format(event.endDate, "MMM d, yyyy")
    : null;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${config.color}`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{event.name}</h3>
                <Badge variant="secondary" className="mt-1">
                  {config.label}
                </Badge>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(event.id)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(event.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Date info */}
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>
                {startDateStr}
                {endDateStr && ` - ${endDateStr}`}
              </span>
              {duration && duration > 1 && (
                <span className="text-muted-foreground/60">
                  ({duration} days)
                </span>
              )}
            </div>

            {/* Location */}
            {event.location && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>
                  {event.location.locality}, {event.location.country}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
