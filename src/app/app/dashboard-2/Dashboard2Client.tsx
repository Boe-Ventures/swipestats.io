"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarPlus,
  ChevronRight,
  Columns2,
  Crown,
  Flame,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/server/better-auth/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useTRPC } from "@/trpc/react";
import { readPhotoAnalysis } from "@/lib/photo-analysis";

import { SwipestatsPlanUpgradeModal } from "../components/SwipestatsPlanUpgradeModal";
import { AddEventDialog } from "../events/AddEventDialog";
import { CreateComparisonDialog } from "@/app/app/profile-compare/create-comparison-dialog";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";

import { HeroInsightCard } from "./HeroInsightCard";
import { NextActionsRow } from "./NextActionsRow";

import type { NextAction } from "./NextActionsRow";

const STALE_AFTER_DAYS = 30;

export function Dashboard2Client() {
  const { data: session } = authClient.useSession();
  const { effectiveTier, isLifetime, periodEnd } = useSubscription();
  const trpc = useTRPC();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [createComparisonOpen, setCreateComparisonOpen] = useState(false);

  const hasPremiumAccess = effectiveTier === "PLUS" || effectiveTier === "ELITE";

  const { data: uploadedProfiles, isLoading: profilesLoading } = useQuery(
    trpc.user.getUploadedProfiles.queryOptions(undefined, {
      enabled: !!session?.user,
    }),
  );
  const latestTinder = uploadedProfiles?.tinder[0];
  const latestHinge = uploadedProfiles?.hinge[0];

  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, { refetchOnWindowFocus: false }),
  );
  const photosQuery = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );
  const comparisonsQuery = useQuery(trpc.profileCompare.list.queryOptions());
  const roastQuery = useQuery(
    trpc.roast.getByProfile.queryOptions(
      { tinderProfileId: latestTinder?.tinderId },
      { enabled: !!latestTinder },
    ),
  );

  const eventCount = eventsQuery.data?.length ?? 0;
  const unanalyzedPhotoCount = (photosQuery.data ?? []).filter(
    (p) => p.mimeType.startsWith("image/") && !readPhotoAnalysis(p.metadata),
  ).length;

  // Priority-ordered "next best action" candidates; only the top 3 render.
  const actions: NextAction[] = [];

  const uploadCandidates: Array<{
    provider: "tinder" | "hinge";
    updatedAt: Date;
  }> = [];
  if (latestTinder) {
    uploadCandidates.push({ provider: "tinder", updatedAt: latestTinder.updatedAt });
  }
  if (latestHinge) {
    uploadCandidates.push({ provider: "hinge", updatedAt: latestHinge.updatedAt });
  }
  const stalestProfile = uploadCandidates.sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
  )[0];

  if (
    stalestProfile &&
    Date.now() - stalestProfile.updatedAt.getTime() >
      STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
  ) {
    actions.push({
      key: "stale-data",
      icon: RefreshCw,
      iconClassName: "bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
      title: "Your data is getting stale",
      description: `Last ${stalestProfile.provider === "tinder" ? "Tinder" : "Hinge"} update ${formatDistanceToNow(stalestProfile.updatedAt, { addSuffix: true })}`,
      href: `/upload?provider=${stalestProfile.provider}&update=true`,
    });
  }

  if (latestTinder && roastQuery.isSuccess && !roastQuery.data) {
    actions.push({
      key: "get-roast",
      icon: Flame,
      iconClassName: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      title: "Get your AI roast",
      description: "Brutally honest feedback on your stats",
      href: `/insights/tinder/${latestTinder.tinderId}`,
    });
  }

  if (unanalyzedPhotoCount > 0) {
    actions.push({
      key: "analyze-photos",
      icon: ScanSearch,
      iconClassName:
        "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
      title: `Analyze ${unanalyzedPhotoCount} photo${unanalyzedPhotoCount === 1 ? "" : "s"}`,
      description: "AI-tag your library to unlock profile compose",
      href: "/app/profile-compare/photos",
    });
  }

  if (comparisonsQuery.isSuccess && comparisonsQuery.data.length === 0) {
    actions.push({
      key: "create-comparison",
      icon: Columns2,
      iconClassName: "bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
      title: "Build a profile comparison",
      description: "A/B test your photos and prompts",
      onClick: () => setCreateComparisonOpen(true),
    });
  }

  if (eventsQuery.isSuccess && eventCount === 0) {
    actions.push({
      key: "add-event",
      icon: CalendarPlus,
      iconClassName:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      title: "Log a life event",
      description: "See how moves, trips & jobs shift your stats",
      onClick: () => setEventDialogOpen(true),
    });
  }

  if (latestTinder) {
    actions.push({
      key: "explore-insights",
      icon: BarChart3,
      iconClassName: "bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
      title: "Explore your insights",
      description: "Funnel, activity timeline & conversations",
      href: `/insights/tinder/${latestTinder.tinderId}`,
    });
  }

  if (profilesLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Compact greeting — the hero slot belongs to data, not a welcome banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Here&apos;s where your dating life stands.
        </p>
      </div>

      <HeroInsightCard
        tinder={latestTinder}
        hinge={latestHinge}
        hasPremiumAccess={hasPremiumAccess}
        onUpgradeClick={() => setUpgradeModalOpen(true)}
      />

      <NextActionsRow actions={actions.slice(0, 3)} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Your apps — compact rows, insights are one click away */}
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Your apps
          </h2>

          {latestTinder ? (
            <AppRow
              provider="TINDER"
              updatedAt={latestTinder.updatedAt}
              insightsHref={`/insights/tinder/${latestTinder.tinderId}`}
              updateHref="/upload?provider=tinder&update=true"
              stats={[
                {
                  label: "Matches",
                  value: latestTinder.stats?.matchesTotal?.toLocaleString() ?? "—",
                },
                {
                  label: "Match rate",
                  value:
                    latestTinder.stats?.matchRate != null
                      ? `${(latestTinder.stats.matchRate * 100).toFixed(1)}%`
                      : "—",
                },
                {
                  label: "Messages",
                  value:
                    latestTinder.stats?.messagesSentTotal?.toLocaleString() ?? "—",
                },
              ]}
            />
          ) : (
            <MissingAppRow provider="TINDER" href="/upload?provider=tinder" />
          )}

          {latestHinge ? (
            <AppRow
              provider="HINGE"
              updatedAt={latestHinge.updatedAt}
              insightsHref={`/insights/hinge/${latestHinge.hingeId}`}
              updateHref="/upload?provider=hinge&update=true"
              stats={[
                {
                  label: "Matches",
                  value: latestHinge.stats?.matchesTotal?.toLocaleString() ?? "—",
                },
                {
                  label: "Messages",
                  value:
                    latestHinge.stats?.messagesSentTotal?.toLocaleString() ?? "—",
                },
                {
                  label: "Received",
                  value:
                    latestHinge.stats?.messagesReceivedTotal?.toLocaleString() ??
                    "—",
                },
              ]}
            />
          ) : (
            <MissingAppRow provider="HINGE" href="/upload?provider=hinge" />
          )}
        </div>

        {/* Right rail: paid users get their features, free users get the pitch */}
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {hasPremiumAccess ? "Your Plus features" : "SwipeStats+"}
          </h2>

          {hasPremiumAccess ? (
            <Card className="py-0">
              <CardContent className="p-2">
                <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs">
                  <Crown className="h-3.5 w-3.5 text-pink-500" />
                  {isLifetime
                    ? "Lifetime access"
                    : periodEnd
                      ? `Active until ${new Date(periodEnd).toLocaleDateString()}`
                      : "Active subscription"}
                </div>
                <div className="flex flex-col">
                  {latestTinder && (
                    <FeatureLink
                      icon={Flame}
                      label="AI Roast"
                      href={`/insights/tinder/${latestTinder.tinderId}`}
                    />
                  )}
                  <FeatureLink
                    icon={ScanSearch}
                    label="Photo analysis"
                    href="/app/profile-compare/photos"
                  />
                  <FeatureLink
                    icon={Wand2}
                    label="AI profile compose"
                    href="/app/profile-compare/photos"
                  />
                  {latestTinder && (
                    <FeatureLink
                      icon={BarChart3}
                      label="How you compare"
                      href={`/insights/tinder/${latestTinder.tinderId}/compare`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 dark:border-pink-800 dark:from-pink-950/30 dark:to-rose-950/30">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Upgrade to SwipeStats+</div>
                    <p className="text-muted-foreground text-xs">
                      Cohort rankings, AI roast & photo analysis
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setUpgradeModalOpen(true)}
                  size="sm"
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 font-semibold hover:from-pink-700 hover:to-rose-700"
                >
                  Upgrade to Plus
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SwipestatsPlanUpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
      <AddEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
      <CreateComparisonDialog
        open={createComparisonOpen}
        onOpenChange={setCreateComparisonOpen}
      />
    </div>
  );
}

interface AppRowProps {
  provider: "TINDER" | "HINGE";
  updatedAt: Date;
  insightsHref: string;
  updateHref: string;
  stats: Array<{ label: string; value: string }>;
}

function AppRow({ provider, updatedAt, insightsHref, updateHref, stats }: AppRowProps) {
  const config = getProviderConfig(provider);

  return (
    <Card className="relative py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <ProviderIconChip config={config} className="h-10 w-10 rounded-lg" />

        <Link
          href={insightsHref}
          className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
        >
          <div className="text-sm font-semibold">{config.name}</div>
          <div className="text-muted-foreground text-xs">
            Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
          </div>
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          {stats.map((stat) => (
            <div key={stat.label} className="text-right">
              <div className="text-sm font-bold tabular-nums">{stat.value}</div>
              <div className="text-muted-foreground text-[11px]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sits above the stretched insights link */}
        <div className="relative z-10 flex items-center gap-1">
          <Link href={updateHref}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              title="Update data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Link>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function MissingAppRow({
  provider,
  href,
}: {
  provider: "TINDER" | "HINGE";
  href: string;
}) {
  const config = getProviderConfig(provider);

  return (
    <Link href={href} className="block">
      <Card className="border-dashed py-0 shadow-none transition-colors hover:border-pink-300">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-lg">
            <Upload className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Add {config.name}</div>
            <div className="text-muted-foreground text-xs">
              Upload your data export to see insights
            </div>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </CardContent>
      </Card>
    </Link>
  );
}

function FeatureLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Flame;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
    >
      <Icon className="text-muted-foreground h-4 w-4" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
    </Link>
  );
}
