import type { Metadata } from "next";
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
  BarHistogram,
  AreaSparkline,
  UpsellCard,
  LockedValue,
} from "@/components/golden";

export const metadata: Metadata = {
  title: "Golden Insights (preview)",
  robots: { index: false, follow: false },
};

const AGE_BARS = [
  { label: "18", height: "22%" },
  { label: "21", height: "48%" },
  { label: "24", height: "78%" },
  { label: "27", height: "100%" },
  { label: "30", height: "86%" },
  { label: "33", height: "60%" },
  { label: "36", height: "40%" },
  { label: "39", height: "25%" },
  { label: "42", height: "14%" },
  { label: "45+", height: "8%", muted: true },
];

const SPARK =
  "M0,54 L22,46 L44,34 L66,52 L88,24 L110,32 L132,16 L154,34 L176,20 L198,42 L220,30";

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

        {/* charts row */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Age distribution of matches" meta="n = 4,345" />
            <BarHistogram bars={AGE_BARS} />
          </Panel>
          <Panel>
            <PanelHeader
              title="Daily swipe volume"
              meta="usage[].swipesCombined"
            />
            <div className="pt-2">
              <AreaSparkline
                path={SPARK}
                areaPath={`${SPARK} L220,64 L0,64 Z`}
                height={120}
                width={220}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-gray-400">
              <span>Mar 2025</span>
              <span>Feb 2026</span>
            </div>
          </Panel>
        </div>

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
