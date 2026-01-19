"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Flame, Heart, MapPin, Calendar, Users } from "lucide-react";
import type { DirectoryProfile } from "@/lib/types/directory";
import { AvatarMarker } from "./AvatarMarker";

interface DirectoryActivityFeedProps {
  profiles: DirectoryProfile[];
  maxItems?: number;
}

export function DirectoryActivityFeed({
  profiles,
  maxItems = 15,
}: DirectoryActivityFeedProps) {
  // Sort by createdAt (most recent first) and limit
  const recentProfiles = [...profiles]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, maxItems);

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender?.toUpperCase()) {
      case "MALE":
        return "Male";
      case "FEMALE":
        return "Female";
      case "OTHER":
        return "Other";
      case "MORE":
        return "More";
      default:
        return "User";
    }
  };

  const formatDays = (days: number | null) => {
    if (!days) return null;
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  };

  const profileHref = (profile: DirectoryProfile) =>
    profile.platform === "tinder"
      ? `/insights/tinder/${profile.id}`
      : `/insights/hinge/${profile.id}`;

  if (recentProfiles.length === 0) {
    return null;
  }

  return (
    <div className="bg-background/95 absolute top-4 left-4 z-10 hidden h-auto max-h-[calc(100vh-8rem)] w-64 overflow-y-auto rounded-lg border shadow-lg backdrop-blur-sm lg:block xl:w-72">
      <div className="bg-background/95 sticky top-0 border-b px-4 py-3 backdrop-blur-sm">
        <h3 className="text-sm font-semibold">Recent Activity</h3>
        <p className="text-muted-foreground text-xs">
          {recentProfiles.length} recent profile
          {recentProfiles.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="divide-y">
        {recentProfiles.map((profile, index) => (
          <Link
            key={`${profile.id}-${index}`}
            href={profileHref(profile)}
            className="animate-in fade-in slide-in-from-left-2 hover:bg-muted/30 block px-4 py-3 transition-colors"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="shrink-0">
                <AvatarMarker profile={profile} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground text-sm font-medium">
                    {getGenderLabel(profile.gender)} user
                  </span>
                  {profile.platform === "tinder" ? (
                    <Flame className="h-3.5 w-3.5 text-pink-500" />
                  ) : (
                    <Heart className="h-3.5 w-3.5 text-purple-500" />
                  )}
                </div>

                {profile.country && (
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">from {profile.country}</span>
                  </div>
                )}

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {profile.matchesTotal !== null &&
                    profile.matchesTotal !== undefined && (
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="text-muted-foreground h-3 w-3" />
                        <span className="text-foreground font-semibold">
                          {profile.matchesTotal.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">matches</span>
                      </div>
                    )}
                  {profile.daysInPeriod && (
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="text-muted-foreground h-3 w-3" />
                      <span className="text-foreground font-semibold">
                        {formatDays(profile.daysInPeriod)}
                      </span>
                      <span className="text-muted-foreground">
                        on {profile.platform === "tinder" ? "Tinder" : "Hinge"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-muted-foreground text-xs">
                  {formatTimeAgo(profile.createdAt)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
