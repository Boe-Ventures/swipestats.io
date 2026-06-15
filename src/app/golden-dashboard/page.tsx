import type { Metadata } from "next";
import Link from "next/link";
import { SparklesIcon, LockClosedIcon, BoltIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/ui/button";
import {
  GoldenAppHeader,
  AppPageHeader,
  HeroStats,
  CohortBadge,
  StatTiles,
  Panel,
  PanelHeader,
  Funnel,
  PercentileBars,
  UpsellCard,
  LockedValue,
} from "@/components/golden";

export const metadata: Metadata = {
  title: "Golden Insights (preview)",
  robots: { index: false, follow: false },
};

export default function GoldenDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <GoldenAppHeader active="dashboard" userInitials="KB" />

      <div className="mx-auto max-w-[1216px] px-6 py-10 lg:px-8">
        {/* preview banner */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center text-[12.5px] font-medium text-amber-800">
          <LockClosedIcon className="mr-1 inline h-3.5 w-3.5" />
          Golden insights — preview composed entirely from the golden primitives
          (noindex). The live dashboard is unchanged.
        </div>

        <AppPageHeader
          kicker="Dashboard · Tinder · all time"
          title="Your insights"
          sub="How you really swipe, match, and message."
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Share
              </Button>
              <Button size="sm">Compare</Button>
            </div>
          }
        />

        {/* hero stat band + cohort standing */}
        <div className="mt-7 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
          <HeroStats
            lead={{
              kicker: "Match rate · Tinder · all time",
              value: "19.9%",
              sub: "4,345 matches from 38,608 swipes",
            }}
            stats={[
              { k: "Total swipes", v: "38,608" },
              { k: "Matches", v: "4,345" },
              { k: "Msgs sent", v: "4,733" },
              { k: "Avg response", v: "1h 9m" },
            ]}
          />
          <Panel className="flex flex-col items-start gap-3">
            <PanelHeader title="Your standing" meta="vs men, your age" />
            <CohortBadge tier="top" icon={<SparklesIcon />}>
              Top 10% of men
            </CohortBadge>
            <p className="text-[13px] leading-[1.6] text-gray-600">
              Better match rate than 90% of men your age on Tinder.
            </p>
            <LockedValue className="mt-1">
              <CohortBadge tier="good">Top 3% on response time</CohortBadge>
            </LockedValue>
          </Panel>
        </div>

        {/* tiles */}
        <StatTiles
          className="mt-5"
          items={[
            { k: "Total swipes", v: "38,608" },
            { k: "Like rate", v: "56.6%", d: "↑ 8% vs cohort", trend: "up" },
            { k: "Ghosted", v: "42%", d: "↓ worse than median", trend: "down" },
            { k: "Avg response", v: "1h 9m" },
          ]}
        />

        {/* charts: the real Recharts components, themed golden (not hand-rolled) */}
        <Panel className="mt-5">
          <PanelHeader title="Activity charts" meta="Recharts" />
          <p className="text-[13.5px] leading-[1.6] text-gray-600">
            Charts are the real, data-driven Recharts components, themed with the
            golden{" "}
            <code className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[12px] text-gray-800">
              GOLDEN_CHART_COLORS
            </code>{" "}
            palette. See the live activity chart on the{" "}
            <Link href="/golden" className="font-semibold text-rose-600">
              golden home
            </Link>
            .
          </p>
        </Panel>

        {/* funnel + compare */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Your dating funnel" meta="swiped → chats" />
            <Funnel
              steps={[
                { label: "Swiped right", value: "21,875", width: "100%" },
                {
                  label: "Matches",
                  value: "4,345",
                  width: "62%",
                  drop: "−80% drop-off",
                },
                { label: "Chats", value: "1,265", width: "34%", drop: "−71%" },
                {
                  label: "No reply",
                  value: "3,080",
                  width: "20%",
                  color: "var(--color-gray-400)",
                },
              ]}
            />
          </Panel>
          <Panel>
            <PanelHeader title="How you compare" meta="median match rate" />
            <PercentileBars
              rows={[
                { name: "Women", width: "89%", value: "28.7%" },
                {
                  name: "Non-binary",
                  width: "32%",
                  value: "9.4%",
                  color: "oklch(0.55 0.16 295)",
                },
                {
                  name: "Men",
                  width: "14%",
                  value: "4.6%",
                  color: "oklch(0.62 0.1 200)",
                },
              ]}
            />
          </Panel>
        </div>

        {/* upsell */}
        <UpsellCard
          className="mt-5"
          icon={<BoltIcon />}
          title="Go deeper with SwipeStats+"
          description="Unlock full percentile rankings, message sentiment, and side-by-side profile comparisons."
          action={<Button size="sm">Upgrade</Button>}
        />
      </div>
    </div>
  );
}
