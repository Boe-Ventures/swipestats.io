import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Heart, MessageCircle, RefreshCw, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { rayaProfileTable } from "@/server/db/schema";

export const metadata: Metadata = {
  title: "Your Raya Insights",
  robots: { index: false, follow: false },
};

interface MonthlyActivity {
  month: string;
  likes: number;
  passes: number;
  matches: number;
  messagesSent: number;
}

export default async function RayaInsightsPage({
  params,
}: {
  params: Promise<{ rayaId: string }>;
}) {
  const { rayaId } = await params;
  const session = await getSession();
  const profile = await db.query.rayaProfileTable.findFirst({
    where: eq(rayaProfileTable.rayaId, rayaId),
    with: {
      usage: {
        orderBy: (usage, { asc }) => [asc(usage.dateStamp)],
      },
    },
  });

  if (!profile || !session?.user?.id || profile.userId !== session.user.id) {
    notFound();
  }

  const totals = profile.usage.reduce(
    (total, day) => ({
      likes: total.likes + day.swipeLikes,
      passes: total.passes + day.swipePasses,
      matches: total.matches + day.matches,
      messagesSent: total.messagesSent + day.messagesSent,
    }),
    { likes: 0, passes: 0, matches: 0, messagesSent: 0 },
  );
  const monthly = aggregateMonthly(profile.usage);
  const totalSwipes = totals.likes + totals.passes;
  const matchRate = totals.likes > 0 ? totals.matches / totals.likes : 0;
  const likeRate = totalSwipes > 0 ? totals.likes / totalSwipes : 0;

  return (
    <main className="min-h-screen bg-[#f6f6f4]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-gray-500 uppercase">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-950" />
              Raya data
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
              Your Raya activity
            </h1>
            <p className="mt-3 text-gray-600">
              {format(profile.firstDayOnApp, "MMM d, yyyy")} –{" "}
              {format(profile.lastDayOnApp, "MMM d, yyyy")} ·{" "}
              {profile.daysInProfilePeriod.toLocaleString()} days
            </p>
          </div>
          <Button render={<Link href="/upload/raya" />} variant="outline">
            <RefreshCw className="h-4 w-4" /> Refresh data
          </Button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Zap />}
            label="Total swipes"
            value={totalSwipes}
            detail={`${(likeRate * 100).toFixed(1)}% likes`}
          />
          <MetricCard
            icon={<Heart />}
            label="Matched outcomes"
            value={totals.matches}
            detail={`${(matchRate * 100).toFixed(1)}% of likes`}
          />
          <MetricCard
            icon={<MessageCircle />}
            label="Messages sent"
            value={totals.messagesSent}
            detail="Received messages are not exported"
          />
          <MetricCard
            icon={<Sparkles />}
            label="Active days"
            value={profile.usage.length}
            detail={`${monthly.length} active months`}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">
                Monthly activity
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Likes and passes are sourced from social activity; matched
                outcomes come from Raya&apos;s match-state export.
              </p>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <Legend color="bg-gray-950" label="Likes" />
              <Legend color="bg-gray-300" label="Passes" />
              <Legend color="bg-rose-500" label="Matches" />
            </div>
          </div>

          <div className="mt-7 space-y-4">
            {monthly.map((month) => (
              <ActivityRow key={month.month} activity={month} />
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-950">Profile context</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <ProfileFact label="Gender" value={profile.genderStr} />
              <ProfileFact
                label="Age at upload"
                value={profile.ageAtUpload.toString()}
              />
              <ProfileFact
                label="Location"
                value={profile.residenceLocation ?? "Not retained"}
              />
              <ProfileFact
                label="Work"
                value={
                  [profile.occupation, profile.company]
                    .filter(Boolean)
                    .join(" · ") || "Not retained"
                }
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-6 text-white shadow-sm">
            <h2 className="font-semibold">What this export cannot tell us</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Raya supplies sent messages without recipient or conversation
              identifiers. SwipeStats therefore does not guess at conversations,
              replies, ghosting, or response rates. Location coordinates and all
              direct counterpart identifiers were discarded in your browser.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function aggregateMonthly(
  usage: Array<{
    dateStampRaw: string;
    swipeLikes: number;
    swipePasses: number;
    matches: number;
    messagesSent: number;
  }>,
): MonthlyActivity[] {
  const months = new Map<string, MonthlyActivity>();
  for (const day of usage) {
    const key = day.dateStampRaw.slice(0, 7);
    const month = months.get(key) ?? {
      month: key,
      likes: 0,
      passes: 0,
      matches: 0,
      messagesSent: 0,
    };
    month.likes += day.swipeLikes;
    month.passes += day.swipePasses;
    month.matches += day.matches;
    month.messagesSent += day.messagesSent;
    months.set(key, month);
  }
  return [...months.values()];
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-900 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-gray-950">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-800">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function ActivityRow({ activity }: { activity: MonthlyActivity }) {
  const total = activity.likes + activity.passes;
  const likeWidth = total > 0 ? (activity.likes / total) * 100 : 0;
  const passWidth = 100 - likeWidth;

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[90px_1fr_210px] sm:gap-4">
      <p className="font-mono text-xs text-gray-600">
        {format(new Date(`${activity.month}-01T00:00:00Z`), "MMM yyyy")}
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-gray-950" style={{ width: `${likeWidth}%` }} />
        <div className="bg-gray-300" style={{ width: `${passWidth}%` }} />
      </div>
      <p className="text-xs text-gray-500 sm:text-right">
        {total.toLocaleString()} swipes · {activity.matches} matches ·{" "}
        {activity.messagesSent} messages
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-900">{value}</dd>
    </div>
  );
}
