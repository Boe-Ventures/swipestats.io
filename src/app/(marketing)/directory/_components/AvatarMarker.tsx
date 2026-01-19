"use client";

import { Flame, Heart } from "lucide-react";
import { cn } from "@/components/ui/index";
import type { DirectoryProfile } from "@/lib/types/directory";

interface AvatarMarkerProps {
  profile: DirectoryProfile;
  isHovered?: boolean;
  isFiltered?: boolean;
}

export function AvatarMarker({
  profile,
  isHovered = false,
  isFiltered = false,
}: AvatarMarkerProps) {
  // Gender-based colors
  const getGenderColor = () => {
    switch (profile.gender?.toUpperCase()) {
      case "MALE":
        return "bg-blue-500";
      case "FEMALE":
        return "bg-pink-500";
      case "OTHER":
      case "MORE":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const genderColor = getGenderColor();

  return (
    <div
      className={cn(
        "relative transition-all duration-200",
        isHovered && "z-50 scale-125",
        isFiltered && "opacity-40",
      )}
    >
      {/* Avatar circle */}
      <div
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg",
          genderColor,
          isHovered && "ring-primary ring-2 ring-offset-2",
        )}
      >
        {/* Anonymous avatar icon */}
        <div className="flex h-6 w-6 items-center justify-center text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-full w-full"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        </div>

        {/* Platform badge */}
        <div
          className={cn(
            "absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-sm",
            profile.platform === "tinder" ? "bg-pink-600" : "bg-purple-600",
          )}
        >
          {profile.platform === "tinder" ? (
            <Flame className="h-3 w-3 text-white" />
          ) : (
            <Heart className="h-3 w-3 text-white" />
          )}
        </div>
      </div>

      {/* Pulse effect when hovered */}
      {isHovered && (
        <div
          className={cn(
            "absolute inset-0 animate-ping rounded-full",
            genderColor,
            "opacity-20",
          )}
        />
      )}
    </div>
  );
}
