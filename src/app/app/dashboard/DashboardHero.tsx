"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Calendar,
  UserCircle,
  Sparkles,
  Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SwipestatsPlanUpgradeModal } from "../components/SwipestatsPlanUpgradeModal";
import { AddEventDialog } from "../events/AddEventDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

interface DashboardHeroProps {
  tinderProfiles?: Array<{
    tinderId: string;
    updatedAt: Date;
    stats: {
      matchesTotal: number | null;
      swipeLikesTotal: number | null;
      swipePassesTotal: number | null;
      messagesSentTotal: number | null;
      matchRate: number | null;
    } | null;
  }>;
  hingeProfiles?: Array<{
    hingeId: string;
    updatedAt: Date;
    stats: {
      matchesTotal: number | null;
      swipeLikesTotal: number | null;
      swipePassesTotal: number | null;
      messagesSentTotal: number | null;
    } | null;
  }>;
}

export function DashboardHero({
  tinderProfiles = [],
  hingeProfiles = [],
}: DashboardHeroProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const { effectiveTier, isLifetime, periodEnd } = useSubscription();
  const trpc = useTRPC();
  const latestTinder = tinderProfiles[0];
  const latestHinge = hingeProfiles[0];
  const hasTinder = !!latestTinder;
  const hasHinge = !!latestHinge;

  // Fetch events for count display
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, {
      refetchOnWindowFocus: false,
    }),
  );

  const eventCount = eventsQuery.data?.length ?? 0;

  // Determine CTA content based on tier (MVP: Only FREE and PLUS)
  const getUpgradeCTA = () => {
    if (effectiveTier === "FREE") {
      return {
        title: "Upgrade to SwipeStats+",
        description: "Unlock all insights & premium features",
        icon: Sparkles,
        iconBg: "from-pink-500 to-rose-500",
        buttonText: "Upgrade to Plus",
        showButton: true,
      };
    }

    // PLUS tier (or higher)
    return {
      title: "You're on SwipeStats+",
      description: isLifetime
        ? "Lifetime access"
        : periodEnd
          ? `Active until ${new Date(periodEnd).toLocaleDateString()}`
          : "Active subscription",
      icon: Crown,
      iconBg: "from-pink-500 to-rose-500",
      buttonText: "Manage Plan",
      showButton: false, // No upgrade button for Plus users in MVP
    };
  };

  const upgradeCTA = getUpgradeCTA();

  return (
    <div className="space-y-6">
      {/* Main Heading */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Welcome to Your SwipeStats Dashboard
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl">
          Track, analyze, and optimize your dating app performance
        </p>
      </div>

      {/* Main Grid: Dating Apps (2/3) + Quick Actions (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Section: Your Dating Apps */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Your Dating Apps
            </h2>
            <p className="text-muted-foreground mt-1">
              Upload your data or view your existing insights
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Tinder Card */}
            <Card className="flex flex-col border-pink-100 bg-gradient-to-br from-pink-50 to-red-50 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tinder</CardTitle>
                  {hasTinder && (
                    <span className="text-muted-foreground text-xs">
                      Updated{" "}
                      {formatDistanceToNow(latestTinder.updatedAt, {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                {hasTinder ? (
                  <>
                    {latestTinder.stats && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Total Swipes
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestTinder.stats.swipeLikesTotal != null &&
                            latestTinder.stats.swipePassesTotal != null
                              ? (
                                  latestTinder.stats.swipeLikesTotal +
                                  latestTinder.stats.swipePassesTotal
                                ).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Matches
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestTinder.stats.matchesTotal?.toLocaleString() ??
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Messages Sent
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestTinder.stats.messagesSentTotal?.toLocaleString() ??
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Match Rate
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestTinder.stats.matchRate
                              ? `${(latestTinder.stats.matchRate * 100).toFixed(1)}%`
                              : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Link
                        href={`/insights/tinder/${latestTinder.tinderId}`}
                        className="flex-1"
                      >
                        <Button className="w-full bg-gradient-to-r from-pink-600 to-red-600 text-white hover:from-pink-500 hover:to-red-500">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Stats
                        </Button>
                      </Link>
                      <Link
                        href="/upload?provider=tinder&update=true"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Update
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col py-4 text-center">
                    <div className="mb-3 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
                        <Upload className="h-6 w-6 text-pink-600" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3 text-xs">
                      Upload your Tinder data to see detailed insights and
                      analytics
                    </p>
                    <Link
                      href="/upload?provider=tinder"
                      className="mt-auto w-full"
                    >
                      <Button className="w-full bg-gradient-to-r from-pink-600 to-red-600 text-white hover:from-pink-500 hover:to-red-500">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Tinder Data
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hinge Card */}
            <Card className="flex flex-col border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Hinge</CardTitle>
                  {hasHinge && (
                    <span className="text-muted-foreground text-xs">
                      Updated{" "}
                      {formatDistanceToNow(latestHinge.updatedAt, {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                {hasHinge ? (
                  <>
                    {latestHinge.stats && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Matches
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestHinge.stats.matchesTotal?.toLocaleString() ??
                              "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Swipes
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestHinge.stats.swipeLikesTotal != null &&
                            latestHinge.stats.swipePassesTotal != null
                              ? (
                                  latestHinge.stats.swipeLikesTotal +
                                  latestHinge.stats.swipePassesTotal
                                ).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs font-medium">
                            Messages
                          </p>
                          <p className="text-xl font-bold tabular-nums">
                            {latestHinge.stats.messagesSentTotal?.toLocaleString() ??
                              "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Link
                        href={`/insights/hinge/${latestHinge.hingeId}`}
                        className="flex-1"
                      >
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Stats
                        </Button>
                      </Link>
                      <Link
                        href="/upload?provider=hinge&update=true"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Update
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col py-4 text-center">
                    <div className="mb-3 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <Upload className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3 text-xs">
                      Upload your Hinge data to see detailed insights and
                      analytics
                    </p>
                    <Link
                      href="/upload?provider=hinge"
                      className="mt-auto w-full"
                    >
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Hinge Data
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Privacy Notice - Integrated */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/20">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-muted-foreground flex-1">
                Your data is processed anonymously and securely. We never share
                your personal information.
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Quick Actions */}
        <div className="flex flex-col space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Quick Actions</h2>
            <p className="text-muted-foreground mt-1">
              Manage your profile and events
            </p>
          </div>

          {/* 2-Column Grid for Actions + Upgrade */}
          <div className="grid flex-1 grid-cols-2 gap-3">
            {/* Life Events Card */}
            <Card
              className="h-full cursor-pointer border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              onClick={() => setEventDialogOpen(true)}
            >
              <CardContent className="flex h-full flex-col items-start gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Life Events</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {eventCount === 0
                      ? "Track important moments"
                      : `${eventCount} event${eventCount !== 1 ? "s" : ""} tracked`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Profile Card */}
            <Link href="/app/account" className="block">
              <Card className="h-full border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col items-start gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <UserCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Your Profile</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Update settings
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Upgrade CTA - Spans both columns */}
            <div className="col-span-2">
              <Card
                className={`border-2 bg-gradient-to-br shadow-md transition-all hover:shadow-lg ${
                  effectiveTier === "FREE"
                    ? "animate-pulse-subtle border-pink-300 from-pink-50 via-rose-50 to-purple-50 dark:border-pink-700 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-purple-950/30"
                    : "border-pink-200 from-pink-50 via-rose-50 to-purple-50 dark:border-pink-700 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-purple-950/20"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${upgradeCTA.iconBg} shadow-sm`}
                      >
                        <upgradeCTA.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold">
                            {upgradeCTA.title}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {upgradeCTA.description}
                        </p>
                      </div>
                    </div>
                    {upgradeCTA.showButton && (
                      <Button
                        onClick={() => setUpgradeModalOpen(true)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 font-semibold shadow-sm hover:from-pink-700 hover:to-rose-700 hover:shadow-md"
                      >
                        {upgradeCTA.buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <SwipestatsPlanUpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />

      {/* Add Event Dialog */}
      <AddEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
      />
    </div>
  );
}
