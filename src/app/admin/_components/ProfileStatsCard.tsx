import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format, intervalToDuration, formatDuration } from "date-fns";
import type { TinderProfile, ProfileMeta } from "@/server/db/schema";

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

interface ProfileStatsCardProps {
  profile: TinderProfile;
  meta: ProfileMeta | null;
}

export function ProfileStatsCard({ profile, meta }: ProfileStatsCardProps) {
  const genderDisplay = getGenderDisplay(profile.gender);
  const age = profile.ageAtUpload;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="mb-2 text-lg font-semibold">
            {genderDisplay.text}, {age}
          </h3>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatItem
            label="Total Swipes"
            value={
              meta
                ? (
                    (meta.swipeLikesTotal ?? 0) + (meta.swipePassesTotal ?? 0)
                  ).toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Matches"
            value={
              meta?.matchesTotal != null
                ? meta.matchesTotal.toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Messages Sent"
            value={
              meta?.messagesSentTotal != null
                ? meta.messagesSentTotal.toLocaleString()
                : "—"
            }
          />
          <StatItem
            label="Match Rate"
            value={
              meta?.matchRate != null
                ? `${(meta.matchRate * 100).toFixed(1)}%`
                : "—"
            }
          />
        </div>

        {/* Profile Period */}
        <div className="border-t pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">
                Profile Period
              </span>
              <span>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">
                On Tinder for
              </span>
              <span className="font-bold">
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
        </div>

        {/* Admin Fields */}
        <div className="border-t pt-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Admin Info
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tinder ID</span>
              <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                {profile.tinderId.slice(0, 12)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                {profile.userId?.slice(0, 12)}...
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{format(profile.createdAt, "MMM d, yyyy HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>{format(profile.updatedAt, "MMM d, yyyy HH:mm")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
