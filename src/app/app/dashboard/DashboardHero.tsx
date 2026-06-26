"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Upload,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Calendar,
  UserCircle,
  Sparkles,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SwipestatsPlanUpgradeModal } from "../components/SwipestatsPlanUpgradeModal";
import { AddEventDialog } from "../events/AddEventDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { Panel, PanelHeader } from "@/components/golden";
import { cn } from "@/components/ui/lib/utils";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";

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
  const { trackEvent } = useAnalytics();
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

  // Handler for opening life events dialog with tracking
  const handleOpenEventDialog = () => {
    trackEvent("life_event_dialog_opened", {
      source: "dashboard",
      trigger: "card_click",
      hasExistingEvents: eventCount > 0,
      eventCount,
    });
    setEventDialogOpen(true);
  };

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
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium tracking-[0.07em] text-gray-500 uppercase">
            Dashboard
          </div>
          <h1 className="mt-1 text-[clamp(30px,4vw,44px)] leading-[1.03] font-bold tracking-[-0.03em] text-gray-900">
            Your dating data
          </h1>
          <p className="mt-2 text-[15px] text-gray-600">
            Uploads, comparisons, photos, and next steps in one place.
          </p>
        </div>
        <ButtonLink href="/upload" size="sm">
          <Upload className="h-4 w-4" />
          Upload data
        </ButtonLink>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <SectionHeader
            title="Your apps"
            meta="Tinder + Hinge"
            sub="View your latest insights or refresh the data behind them."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <ProviderPanel
              provider="TINDER"
              updatedAt={latestTinder?.updatedAt}
              insightHref={
                latestTinder
                  ? `/insights/tinder/${latestTinder.tinderId}`
                  : undefined
              }
              uploadHref="/upload?provider=tinder"
              updateHref="/upload?provider=tinder&update=true"
              stats={
                hasTinder
                  ? [
                      {
                        label: "Swipes",
                        value: formatTotal(
                          latestTinder.stats?.swipeLikesTotal,
                          latestTinder.stats?.swipePassesTotal,
                        ),
                      },
                      {
                        label: "Matches",
                        value:
                          latestTinder.stats?.matchesTotal?.toLocaleString() ??
                          "—",
                      },
                      {
                        label: "Messages",
                        value:
                          latestTinder.stats?.messagesSentTotal?.toLocaleString() ??
                          "—",
                      },
                      {
                        label: "Match rate",
                        value:
                          latestTinder.stats?.matchRate != null
                            ? `${(latestTinder.stats.matchRate * 100).toFixed(1)}%`
                            : "—",
                      },
                    ]
                  : undefined
              }
            />

            <ProviderPanel
              provider="HINGE"
              updatedAt={latestHinge?.updatedAt}
              insightHref={
                latestHinge
                  ? `/insights/hinge/${latestHinge.hingeId}`
                  : undefined
              }
              uploadHref="/upload?provider=hinge"
              updateHref="/upload?provider=hinge&update=true"
              stats={
                hasHinge
                  ? [
                      {
                        label: "Matches",
                        value:
                          latestHinge.stats?.matchesTotal?.toLocaleString() ??
                          "—",
                      },
                      {
                        label: "Swipes",
                        value: formatTotal(
                          latestHinge.stats?.swipeLikesTotal,
                          latestHinge.stats?.swipePassesTotal,
                        ),
                      },
                      {
                        label: "Messages",
                        value:
                          latestHinge.stats?.messagesSentTotal?.toLocaleString() ??
                          "—",
                      },
                    ]
                  : undefined
              }
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-600 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.04)]">
            <ShieldCheck className="h-4 w-4 flex-none text-rose-600" />
            <p>
              Direct identifiers are stripped before upload. Your insights stay
              tied to an anonymous SwipeStats profile.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SectionHeader
            title="Next up"
            meta="Actions"
            sub="Useful shortcuts, ordered for repeat use."
          />

          <Panel className="space-y-3 p-4">
            <ActionRow
              icon={<Calendar className="h-4 w-4" />}
              title="Life events"
              description={
                eventCount === 0
                  ? "Track moves, trips, jobs, and dates."
                  : `${eventCount} event${eventCount !== 1 ? "s" : ""} tracked`
              }
              onClick={handleOpenEventDialog}
            />
            <ActionRow
              icon={<UserCircle className="h-4 w-4" />}
              title="Your profile"
              description="Account and privacy settings."
              href="/app/account"
            />
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-rose-600 text-white">
                  <upgradeCTA.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-gray-900">
                    {upgradeCTA.title}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-gray-600">
                    {upgradeCTA.description}
                  </p>
                </div>
              </div>
              {upgradeCTA.showButton && (
                <Button
                  onClick={() => setUpgradeModalOpen(true)}
                  size="sm"
                  className="mt-4 w-full"
                >
                  {upgradeCTA.buttonText}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Panel>
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

function SectionHeader({
  title,
  meta,
  sub,
}: {
  title: string;
  meta?: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>
        {meta && (
          <span className="font-mono text-[11px] text-gray-500">{meta}</span>
        )}
      </div>
      {sub && <p className="mt-1 text-[13.5px] text-gray-600">{sub}</p>}
    </div>
  );
}

function formatTotal(a?: number | null, b?: number | null) {
  if (a == null || b == null) return "—";
  return (a + b).toLocaleString();
}

function ProviderPanel({
  provider,
  updatedAt,
  stats,
  insightHref,
  uploadHref,
  updateHref,
}: {
  provider: "TINDER" | "HINGE";
  updatedAt?: Date;
  stats?: { label: string; value: string }[];
  insightHref?: string;
  uploadHref: string;
  updateHref: string;
}) {
  const config = getProviderConfig(provider);
  const hasProfile = !!stats;

  return (
    <Panel
      className={cn(
        "flex min-h-[220px] flex-col p-5",
        !hasProfile && "border-dashed bg-gray-50/60",
      )}
    >
      <PanelHeader
        title={
          <span className="flex items-center gap-2.5">
            <ProviderIconChip config={config} />
            {config.name}
          </span>
        }
        meta={
          updatedAt
            ? formatDistanceToNow(updatedAt, { addSuffix: true })
            : "Not uploaded"
        }
      />

      {hasProfile ? (
        <>
          <div
            className={cn(
              "grid gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200",
              stats.length === 3 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white px-4 py-3">
                <div className="font-mono text-[10px] tracking-[0.05em] text-gray-500 uppercase">
                  {stat.label}
                </div>
                <div className="mt-1 text-[24px] leading-none font-bold tracking-[-0.03em] text-gray-900 tabular-nums">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex gap-2 pt-5">
            <ButtonLink href={insightHref ?? uploadHref} className="flex-1">
              <BarChart3 className="h-4 w-4" />
              View stats
            </ButtonLink>
            <ButtonLink href={updateHref} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4" />
              Update
            </ButtonLink>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 bg-white text-rose-600">
            <Upload className="h-5 w-5" />
          </div>
          <p className="mt-3 max-w-[230px] text-[13px] leading-5 text-gray-600">
            Upload your {config.name} export to unlock insights and comparisons.
          </p>
          <ButtonLink href={uploadHref} size="sm" className="mt-4">
            <Upload className="h-4 w-4" />
            Upload {config.name}
          </ButtonLink>
        </div>
      )}
    </Panel>
  );
}

function ActionRow({
  icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-gray-300 hover:bg-gray-50">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-gray-100 text-gray-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-gray-900">{title}</div>
        <div className="truncate text-[12.5px] text-gray-600">
          {description}
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 flex-none text-gray-400" />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block w-full">
      {content}
    </button>
  );
}
