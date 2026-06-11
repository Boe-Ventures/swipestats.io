"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  Crown,
  Images,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { authClient } from "@/server/better-auth/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useTRPC } from "@/trpc/react";
import { readPhotoAnalysis } from "@/lib/photo-analysis";

import { RoastCtaStrip } from "@/components/roast/roast-cta-strip";
import { SwipestatsPlanUpgradeModal } from "../components/SwipestatsPlanUpgradeModal";
import { AddEventDialog } from "../events/AddEventDialog";
import { CreateComparisonDialog } from "@/app/app/profile-compare/create-comparison-dialog";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";

import type { RouterOutputs } from "@/trpc/react";

type Comparison = RouterOutputs["profileCompare"]["list"][number];

export function Dashboard3Client() {
  const { data: session } = authClient.useSession();
  const { effectiveTier, isLifetime } = useSubscription();
  const router = useRouter();
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

  const comparisonsQuery = useQuery(trpc.profileCompare.list.queryOptions());
  const eventsQuery = useQuery(
    trpc.event.list.queryOptions(undefined, { refetchOnWindowFocus: false }),
  );
  const photosQuery = useQuery(
    trpc.blob.getUserUploads.queryOptions({ limit: 100 }),
  );
  const roastQuery = useQuery(
    trpc.roast.getByProfile.queryOptions(
      { tinderProfileId: latestTinder?.tinderId },
      { enabled: !!latestTinder },
    ),
  );

  const eventCount = eventsQuery.data?.length ?? 0;
  const photos = (photosQuery.data ?? []).filter((p) =>
    p.mimeType.startsWith("image/"),
  );
  const unanalyzedCount = photos.filter(
    (p) => !readPhotoAnalysis(p.metadata),
  ).length;
  const roast = roastQuery.data;

  if (profilesLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header row — utility, not ceremony */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {session?.user?.name ? `Signed in as ${session.user.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPremiumAccess ? (
            <Badge
              variant="outline"
              className="gap-1 border-pink-200 text-pink-600 dark:border-pink-800 dark:text-pink-400"
            >
              <Crown className="h-3 w-3" />
              SwipeStats+{isLifetime ? " · Lifetime" : ""}
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpgradeModalOpen(true)}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-pink-500" />
              Upgrade
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateComparisonOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New comparison
          </Button>
        </div>
      </div>

      {/* App tiles */}
      <div className="grid gap-4 sm:grid-cols-2">
        {latestTinder ? (
          <AppTile
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
          <MissingAppTile provider="TINDER" href="/upload?provider=tinder" />
        )}

        {latestHinge ? (
          <AppTile
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
          <MissingAppTile provider="HINGE" href="/upload?provider=hinge" />
        )}
      </div>

      {/* Roast teaser — the funniest line is the hook to come back */}
      {latestTinder && (
        <RoastCtaStrip
          title={roast ? "Your AI roast" : "Get your AI roast"}
          description={
            roast
              ? roast.headline
              : "Brutally honest, data-driven feedback on your stats"
          }
          badge={roast?.tagline}
          actionLabel={roast ? "Read it" : "Roast me"}
          onClick={() => router.push(`/insights/tinder/${latestTinder.tinderId}`)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Comparisons — the thing you actually come back to work on */}
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Profile comparisons
          </h2>

          {comparisonsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : (comparisonsQuery.data?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {comparisonsQuery.data?.map((comparison) => (
                <ComparisonRow key={comparison.id} comparison={comparison} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed py-0 shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  A/B test your photos and prompts side by side.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateComparisonOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create your first comparison
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right rail: photo library, events, shortcuts */}
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Library & more
          </h2>

          {/* Photo library preview */}
          <Card className="py-0">
            <CardContent className="space-y-3 p-4">
              <Link
                href="/app/profile-compare/photos"
                className="group flex items-center justify-between"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Images className="text-muted-foreground h-4 w-4" />
                  Photo library
                </span>
                <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {photos.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-1.5">
                    {photos.slice(0, 8).map((photo) => (
                      <div
                        key={photo.id}
                        className="bg-muted relative aspect-square overflow-hidden rounded-md"
                      >
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {photos.length} photo{photos.length === 1 ? "" : "s"}
                    {unanalyzedCount > 0 && (
                      <>
                        {" · "}
                        <span className="font-medium text-amber-600 dark:text-amber-500">
                          {unanalyzedCount} to analyze
                        </span>
                      </>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Upload photos to get AI feedback and build profiles from them.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Life events */}
          <Card className="py-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/40">
                <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Life events</div>
                <div className="text-muted-foreground text-xs">
                  {eventCount === 0
                    ? "Correlate stats with real life"
                    : `${eventCount} event${eventCount === 1 ? "" : "s"} tracked`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setEventDialogOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card className="py-0">
            <CardContent className="flex flex-col p-2">
              <QuickLink icon={Settings} label="Account settings" href="/app/account" />
              <QuickLink icon={Upload} label="Upload new data" href="/upload" />
              {latestTinder && (
                <QuickLink
                  icon={RefreshCw}
                  label="Update Tinder data"
                  href="/upload?provider=tinder&update=true"
                />
              )}
            </CardContent>
          </Card>
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

interface AppTileProps {
  provider: "TINDER" | "HINGE";
  updatedAt: Date;
  insightsHref: string;
  updateHref: string;
  stats: Array<{ label: string; value: string }>;
}

function AppTile({ provider, updatedAt, insightsHref, updateHref, stats }: AppTileProps) {
  const config = getProviderConfig(provider);

  return (
    <Card className="relative py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
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
          {/* Sits above the stretched insights link */}
          <Link href={updateHref} className="relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8"
              title="Update data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-lg font-bold tabular-nums">{stat.value}</div>
              <div className="text-muted-foreground text-[11px]">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MissingAppTile({
  provider,
  href,
}: {
  provider: "TINDER" | "HINGE";
  href: string;
}) {
  const config = getProviderConfig(provider);

  return (
    <Link href={href} className="block">
      <Card className="h-full border-dashed py-0 shadow-none transition-colors hover:border-pink-300">
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-lg">
            <Upload className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">Add {config.name}</div>
          <div className="text-muted-foreground text-xs">
            Upload your data export to see insights
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ComparisonRow({ comparison }: { comparison: Comparison }) {
  const thumbnail = comparison.columns[0]?.content[0]?.attachment?.url;

  return (
    <Card className="relative py-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-3">
        <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Images className="text-muted-foreground/50 h-5 w-5" />
            </div>
          )}
        </div>

        <Link
          href={`/app/profile-compare/${comparison.id}`}
          className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
        >
          <div className="truncate text-sm font-semibold">
            {comparison.name || "Untitled comparison"}
          </div>
          <div className="text-muted-foreground text-xs">
            {comparison.columns.length}{" "}
            {comparison.columns.length === 1 ? "app" : "apps"} · updated{" "}
            {formatDistanceToNow(new Date(comparison.updatedAt), {
              addSuffix: true,
            })}
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {comparison.columns.slice(0, 4).map((column) => (
            <ProviderIconChip
              key={column.id}
              config={getProviderConfig(column.dataProvider)}
              className="h-6 w-6 rounded-md"
            />
          ))}
          <ChevronRight className="text-muted-foreground ml-1 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Settings;
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
