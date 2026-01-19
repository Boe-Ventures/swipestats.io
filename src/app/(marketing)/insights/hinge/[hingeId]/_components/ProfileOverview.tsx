"use client";

import {
  MapPin,
  Calendar as CalendarIcon,
  Globe,
  BadgeCheck,
} from "lucide-react";
import { useHingeInsights } from "../HingeInsightsProvider";
import { getWeMetStats } from "@/lib/types/hinge-profile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { format, intervalToDuration, formatDuration } from "date-fns";

function getGenderDisplay(gender: string | null) {
  switch (gender) {
    case "MALE":
      return { symbol: "♂", text: "Man" };
    case "FEMALE":
      return { symbol: "♀", text: "Woman" };
    default:
      return { symbol: "◦", text: "Person" };
  }
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function ProfileOverview({ className }: { className?: string }) {
  const { profile, meta, hingeId } = useHingeInsights();

  if (!profile) {
    return <div>Loading...</div>;
  }

  const weMetStats = getWeMetStats(profile);
  const genderDisplay = getGenderDisplay(profile.gender);
  const age = profile.ageAtUpload;

  // Calculate total messages
  const totalMessages =
    (meta?.messagesSentTotal ?? 0) + (meta?.messagesReceivedTotal ?? 0);

  return (
    <Card
      className={`shadow-lg transition-shadow hover:shadow-xl ${className ?? ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {genderDisplay.text}, {age}
              </h2>
              {profile.selfieVerified && (
                <BadgeCheck className="h-5 w-5 text-blue-500" />
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {profile.country && (
              <ButtonLink
                variant="outline"
                size="sm"
                href={`/directory?view=map&focusProfile=${hingeId}`}
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">View on Map</span>
              </ButtonLink>
            )}
          </div>
        </div>

        {/* Location and Active Period */}
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {profile.country && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.country}</span>
            </div>
          )}
          {meta && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>Active from {format(meta.from, "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Stats - Compact Row */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-8 xl:grid-cols-4">
          <StatItem
            label="Total Matches"
            value={meta?.matchesTotal?.toLocaleString() ?? "—"}
          />
          <StatItem label="Messages" value={totalMessages.toLocaleString()} />
          <StatItem
            label="Conversations"
            value={meta?.conversationsWithMessages?.toLocaleString() ?? "—"}
          />
          <StatItem label="We Met" value={weMetStats.yes.toString()} />
        </div>

        {/* Profile Period - Compact */}
        {meta && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">
                Profile Period
              </span>
              <span className="ml-2">
                {new Date(meta.from).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                -{" "}
                {new Date(meta.to).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">
                On Hinge for
              </span>
              <span className="ml-2 font-bold">
                {formatDuration(
                  intervalToDuration({
                    start: new Date(meta.from),
                    end: new Date(meta.to),
                  }),
                  { format: ["years", "months"], delimiter: ", " },
                ) || "Less than a month"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
