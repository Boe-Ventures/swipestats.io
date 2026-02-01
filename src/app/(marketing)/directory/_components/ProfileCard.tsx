import Link from "next/link";
import {
  Check,
  Heart,
  Sparkles,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format, subDays } from "date-fns";
import type { DirectoryProfile } from "@/lib/types/directory";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProfileCardProps {
  profile: DirectoryProfile;
  variant?: "browse" | "select";
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  showProfileId?: boolean;
  specialLabel?: string | null;
  // For comparison mode
  userMatchRate?: number | null;
  userDateRange?: { from: Date; to: Date } | null;
}

function getGenderDisplay(gender: string) {
  if (gender === "MALE" || gender === "M") return "Man";
  if (gender === "FEMALE" || gender === "F") return "Woman";
  return "Person";
}

export function ProfileCard({
  profile,
  variant = "browse",
  isSelected = false,
  onSelect,
  showProfileId: _showProfileId = false,
  specialLabel,
  userMatchRate,
  userDateRange,
}: ProfileCardProps) {
  const profileHref =
    profile.platform === "tinder"
      ? `/insights/tinder/${profile.id}`
      : `/insights/hinge/${profile.id}`;

  // Format match rate as percentage
  const matchRate = profile.matchRate
    ? `${(profile.matchRate * 100).toFixed(1)}%`
    : "N/A";

  // Format location - prefer user location, fallback to profile location
  const location =
    profile.userCity && profile.userCountry
      ? `${profile.userCity}, ${profile.userCountry}`
      : [profile.city, profile.country].filter(Boolean).join(", ");

  // Check if profile is new (uploaded in last 7 days)
  const isNew = profile.createdAt
    ? new Date().getTime() - profile.createdAt.getTime() <
      7 * 24 * 60 * 60 * 1000
    : false;

  // Format time since upload
  const timeSinceUpload = profile.createdAt
    ? formatDistanceToNow(profile.createdAt, { addSuffix: true })
    : null;

  // Calculate and format date range
  const dateRange =
    profile.createdAt && profile.daysInPeriod
      ? (() => {
          const endDate = profile.createdAt;
          const startDate = subDays(endDate, profile.daysInPeriod);
          return `${format(startDate, "MMM yyyy")} - ${format(endDate, "MMM yyyy")}`;
        })()
      : null;

  // Determine match rate color
  const _getMatchRateColor = () => {
    if (!profile.matchRate) return "text-muted-foreground";
    const rate = profile.matchRate * 100;
    if (rate >= 20) return "text-green-600 dark:text-green-400";
    if (rate >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get relative match rate badge (for select variant with comparison)
  const getRelativeMatchRateBadge = () => {
    if (!profile.matchRate || !userMatchRate) return null;

    const diff = profile.matchRate - userMatchRate;
    const absDiff = Math.abs(diff);
    const percentage = (absDiff * 100).toFixed(1);

    if (diff > 0 || diff === 0) {
      // Higher or same (treat 0 as positive)
      return {
        label: percentage === "0.0" ? "Same" : `${percentage}% higher`,
        icon: TrendingUp,
        color: "text-green-600 dark:text-green-400",
        variant: "default" as const,
      };
    } else {
      // Lower
      return {
        label: `${percentage}% lower`,
        icon: TrendingDown,
        color: "text-red-600 dark:text-red-400",
        variant: "secondary" as const,
      };
    }
  };

  // Check if date ranges overlap
  const hasDateOverlap = () => {
    if (!userDateRange || !profile.createdAt || !profile.daysInPeriod) {
      return false;
    }

    const compEnd = profile.createdAt;
    const compStart = subDays(compEnd, profile.daysInPeriod);

    // Overlap if: compStart <= userEnd AND compEnd >= userStart
    return compStart <= userDateRange.to && compEnd >= userDateRange.from;
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString();
  };

  const relativeMatchRateBadge = getRelativeMatchRateBadge();
  const hasOverlap = hasDateOverlap();
  const showNoOverlapWarning =
    variant === "select" && userDateRange && !hasOverlap;

  // Card content (shared between browse and select)
  const cardContent = (
    <>
      {/* Selection checkmark (select mode only) */}
      {variant === "select" && isSelected && (
        <div className="bg-primary ring-background absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-lg ring-4">
          <Check className="h-5 w-5 text-white" />
        </div>
      )}

      {/* New badge (browse mode only) */}
      {variant === "browse" && isNew && (
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant="default"
            className="bg-primary/10 text-primary hover:bg-primary/20 gap-1"
          >
            <Sparkles className="h-3 w-3" />
            New
          </Badge>
        </div>
      )}

      {/* Special Label in top-right (e.g., Creator of SwipeStats) */}
      {specialLabel && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="border-0 bg-linear-to-r from-pink-600 to-rose-600 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            {specialLabel}
          </Badge>
        </div>
      )}

      {/* Header - Gender and Age (top-left) */}
      <div className="mb-3">
        <h3 className="mb-2 text-lg font-bold">
          {getGenderDisplay(profile.gender)}, {profile.ageAtUpload}
        </h3>

        {/* Row of badges: Comparison + Overlap + Platform */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Relative match rate badge (select mode with comparison) */}
          {variant === "select" && relativeMatchRateBadge && (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border-2",
                relativeMatchRateBadge.color,
                relativeMatchRateBadge.label.includes("higher")
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : relativeMatchRateBadge.label === "Same"
                    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                    : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
              )}
            >
              <relativeMatchRateBadge.icon className="h-3 w-3" />
              {relativeMatchRateBadge.label}
            </Badge>
          )}

          {/* No overlap warning badge */}
          {showNoOverlapWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                >
                  <Calendar className="h-3 w-3" />
                  No overlap
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Not active during the same time period as your profile</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Platform badge for browse mode only */}
          {variant === "browse" && (
            <Badge
              variant="outline"
              className={cn(
                profile.platform === "tinder"
                  ? "border-pink-200 bg-pink-100 text-pink-700 dark:border-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                  : "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
              )}
            >
              {profile.platform === "tinder" ? "Tinder" : "Hinge"}
            </Badge>
          )}
        </div>
      </div>

      {/* Location and Date Range - One Line */}
      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}
        {dateRange && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateRange}</span>
          </div>
        )}
      </div>

      {/* Time since upload (browse mode only) */}
      {variant === "browse" && timeSinceUpload && (
        <div className="text-muted-foreground mb-3 text-xs">
          Uploaded {timeSinceUpload}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 p-2.5">
        {/* Matches */}
        <div className="text-center">
          <div className="mb-0.5 flex items-center justify-center gap-1">
            <Heart className="text-primary h-3 w-3" />
          </div>
          <div className="text-foreground mb-0.5 text-base font-semibold tabular-nums">
            {formatNumber(profile.matchesTotal)}
          </div>
          <div className="text-muted-foreground text-xs">Matches</div>
        </div>

        {/* Likes */}
        <div className="text-center">
          <div className="mb-0.5 flex items-center justify-center gap-1">
            <Sparkles className="text-primary h-3 w-3" />
          </div>
          <div className="text-foreground mb-0.5 text-base font-semibold tabular-nums">
            {formatNumber(profile.swipeLikesTotal)}
          </div>
          <div className="text-muted-foreground text-xs">Likes</div>
        </div>

        {/* Match Rate */}
        <div className="text-center">
          <div className="mb-0.5 flex items-center justify-center gap-1">
            <TrendingUp className="text-primary h-3 w-3" />
          </div>
          <div className="text-foreground mb-0.5 text-base font-semibold tabular-nums">
            {matchRate}
          </div>
          <div className="text-muted-foreground text-xs">Match Rate</div>
        </div>
      </div>

      {/* Selected overlay (select mode only) */}
      {variant === "select" && isSelected && (
        <div className="from-primary/5 pointer-events-none absolute inset-0 rounded-xl bg-linear-to-br to-transparent" />
      )}
    </>
  );

  // Browse mode: Link wrapper
  if (variant === "browse") {
    return (
      <Link href={profileHref} className="group block">
        <div className="bg-card hover:border-primary/50 relative rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
          {cardContent}
        </div>
      </Link>
    );
  }

  // Select mode: Button wrapper
  return (
    <button
      onClick={() => onSelect?.(profile.id)}
      disabled={isSelected}
      className={cn(
        "group bg-card relative w-full rounded-xl border p-5 text-left transition-all duration-200",
        "hover:border-primary/50 hover:scale-[1.02] hover:shadow-lg",
        isSelected
          ? "border-primary bg-primary/5 ring-primary/20 shadow-md ring-2"
          : "hover:bg-accent/50",
        isSelected && "cursor-default hover:scale-100",
      )}
    >
      {cardContent}
    </button>
  );
}
