import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Zap, ArrowRight } from "lucide-react";

type ProfileType = "tinder" | "hinge";

interface ProfileStats {
  matchesTotal: number | null;
  swipeLikesTotal: number | null;
  swipePassesTotal: number | null;
  messagesSentTotal: number | null;
  messagesReceivedTotal: number | null;
}

interface UploadedProfileCardProps {
  type: ProfileType;
  profileId: string;
  uploadedAt: Date;
  city?: string | null;
  country?: string | null;
  stats: ProfileStats | null;
  daysInPeriod?: number;
}

export function UploadedProfileCard({
  type,
  profileId,
  uploadedAt,
  city,
  country,
  stats,
  daysInPeriod,
}: UploadedProfileCardProps) {
  const appName = type === "tinder" ? "Tinder" : "Hinge";
  const badgeColor =
    type === "tinder"
      ? "bg-pink-100 text-pink-700"
      : "bg-purple-100 text-purple-700";
  const insightsUrl = `/insights/${type}/${profileId}`;

  const location =
    [city, country].filter(Boolean).join(", ") || "Unknown location";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              {appName}
              <Badge variant="secondary" className={`text-xs ${badgeColor}`}>
                {type.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Uploaded {formatDistanceToNow(uploadedAt, { addSuffix: true })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location info */}
        <div className="text-muted-foreground text-sm">
          <p>{location}</p>
          {daysInPeriod && (
            <p className="mt-1">
              {daysInPeriod} {daysInPeriod === 1 ? "day" : "days"} of data
            </p>
          )}
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-gray-50 p-3 text-center">
              <Heart className="text-muted-foreground mx-auto mb-1 h-4 w-4" />
              <p className="text-lg font-semibold text-gray-900">
                {stats.matchesTotal?.toLocaleString() ?? "—"}
              </p>
              <p className="text-muted-foreground text-xs">Matches</p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 text-center">
              <Zap className="text-muted-foreground mx-auto mb-1 h-4 w-4" />
              <p className="text-lg font-semibold text-gray-900">
                {stats.swipeLikesTotal != null && stats.swipePassesTotal != null
                  ? (
                      stats.swipeLikesTotal + stats.swipePassesTotal
                    ).toLocaleString()
                  : "—"}
              </p>
              <p className="text-muted-foreground text-xs">Swipes</p>
            </div>

            <div className="rounded-lg border bg-gray-50 p-3 text-center">
              <MessageCircle className="text-muted-foreground mx-auto mb-1 h-4 w-4" />
              <p className="text-lg font-semibold text-gray-900">
                {stats.messagesSentTotal?.toLocaleString() ?? "—"}
              </p>
              <p className="text-muted-foreground text-xs">Messages</p>
            </div>
          </div>
        )}

        {!stats && (
          <div className="text-muted-foreground rounded-lg border bg-gray-50 p-4 text-center text-sm">
            No statistics available
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={insightsUrl} className="w-full">
          <Button className="w-full" variant="default">
            View Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
