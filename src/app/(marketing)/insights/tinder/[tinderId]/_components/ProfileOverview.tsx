"use client";

import { useRouter } from "next/navigation";
import { MapPin, Calendar as CalendarIcon, Globe, Users } from "lucide-react";
import { useTinderProfile } from "../TinderProfileProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { format, intervalToDuration, formatDuration } from "date-fns";

function getGenderDisplay(gender: string) {
  switch (gender) {
    case "MALE":
      return { symbol: "♂", text: "Man" };
    case "FEMALE":
      return { symbol: "♀", text: "Woman" };
    default:
      return { symbol: "◦", text: "Person" };
  }
}

/**
 * Profile overview with comprehensive statistics and profile information
 */
export function ProfileOverview({ className }: { className?: string }) {
  const { profile, meta, tinderId } = useTinderProfile();
  const router = useRouter();

  const handleCompare = () => {
    router.push(`/insights/tinder/${tinderId}/compare`);
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  const globalMeta = meta;
  const genderDisplay = getGenderDisplay(profile.gender);
  const age = profile.ageAtUpload;

  return (
    <Card
      className={`shadow-lg transition-shadow hover:shadow-xl ${className ?? ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {genderDisplay.text}, {age}
            </h2>
          </div>
          <div className="flex gap-2">
            <ButtonLink
              variant="outline"
              size="sm"
              href={`/directory?view=map&focusProfile=${tinderId}`}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">View on Map</span>
            </ButtonLink>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompare}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </Button>
          </div>
        </div>

        {/* Location and Joined Date */}
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {profile.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>
                {profile.city}
                {profile.region && `, ${profile.region}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            <span>Joined {format(profile.createDate, "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Stats - Compact Row */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-8 xl:grid-cols-4">
          <StatItem
            label="Total Swipes"
            value={
              globalMeta
                ? (
                    (globalMeta.swipeLikesTotal ?? 0) +
                    (globalMeta.swipePassesTotal ?? 0)
                  ).toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Matches"
            value={
              globalMeta?.matchesTotal != null
                ? globalMeta.matchesTotal.toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Messages Sent"
            value={
              globalMeta?.messagesSentTotal != null
                ? globalMeta.messagesSentTotal.toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Match Rate"
            value={
              globalMeta?.matchRate != null
                ? `${(globalMeta.matchRate * 100).toFixed(1)}%`
                : "—"
            }
          />
        </div>

        {/* Profile Period - Compact */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground font-medium">
              Profile Period
            </span>
            <span className="ml-2">
              {profile.firstDayOnApp.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              -{" "}
              {profile.lastDayOnApp.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">
              On Tinder for
            </span>
            <span className="ml-2 font-bold">
              {formatDuration(
                intervalToDuration({
                  start: profile.firstDayOnApp,
                  end: profile.lastDayOnApp,
                }),
                { format: ["years", "months"], delimiter: ", " },
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
