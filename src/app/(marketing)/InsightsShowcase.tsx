"use client";

import { useEffect, useRef, useState } from "react";
import { TinderProfileProvider } from "./insights/tinder/[tinderId]/TinderProfileProvider";
import { MasterActivityChart } from "./insights/tinder/[tinderId]/_components/charts/MasterActivityChart";
import { TinderInsightsFunnel } from "./insights/tinder/[tinderId]/_components/TinderInsightsFunnel";
import { ProfileOverview } from "./insights/tinder/[tinderId]/_components/ProfileOverview";
import { MessagesMetaCard } from "./insights/tinder/[tinderId]/_components/MessagesMetaCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from "@/server/db/schema";
import type { TinderProfileWithUsage } from "@/lib/types/profile";

/**
 * Loading skeleton that matches the showcase layout
 */
function ShowcaseSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Chart skeleton */}
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>

      {/* Two column layout skeleton */}
      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>

        <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type DemoData = {
  profile: TinderProfileWithUsage;
  events: Event[];
};

/**
 * Marketing showcase component that displays demo insights without backend calls
 * Lazy loads data from public folder when component becomes visible
 */
export function InsightsShowcase() {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when component is in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before it comes into view
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch demo data when component becomes visible
  useEffect(() => {
    if (!isVisible || demoData) return;

    fetch("/demo-profile.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load demo data");
        return res.json() as Promise<{
          profile: {
            createDate: string;
            birthDate: string;
            createdAt: string;
            updatedAt: string;
            firstDayOnApp: string;
            lastDayOnApp: string;
            usage: Array<{
              dateStamp: string;
              [key: string]: unknown;
            }>;
            profileMeta: Array<{
              createdAt: string;
              updatedAt: string;
              [key: string]: unknown;
            }>;
            [key: string]: unknown;
          };
          events: Array<{
            startDate: string;
            endDate: string | null;
            createdAt: string;
            updatedAt: string;
            [key: string]: unknown;
          }>;
        }>;
      })
      .then((data) => {
        const { profile, events } = data;

        // Convert date strings to Date objects for profile
        const profileWithDates = {
          ...profile,
          createDate: new Date(profile.createDate),
          birthDate: new Date(profile.birthDate),
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt),
          firstDayOnApp: new Date(profile.firstDayOnApp),
          lastDayOnApp: new Date(profile.lastDayOnApp),
          // Convert dateStamp strings to Date objects for usage
          usage: profile.usage.map((u) => ({
            ...u,
            dateStamp: new Date(u.dateStamp),
          })),
          // Convert date strings for profileMeta
          profileMeta: profile.profileMeta.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
            updatedAt: new Date(m.updatedAt),
          })),
        } as unknown as TinderProfileWithUsage;

        // Convert date strings for events
        const eventsWithDates = events.map((e) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: e.endDate ? new Date(e.endDate) : null,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        })) as unknown as Event[];

        setDemoData({
          profile: profileWithDates,
          events: eventsWithDates,
        });
      })
      .catch((error) => {
        console.error("Failed to load demo data:", error);
      });
  }, [isVisible, demoData]);

  // Show skeleton while loading
  if (!demoData) {
    return (
      <div ref={containerRef}>
        <ShowcaseSkeleton />
      </div>
    );
  }

  const { profile, events } = demoData;

  return (
    <div ref={containerRef}>
      <TinderProfileProvider
        tinderId={profile.tinderId}
        initialProfile={profile}
        initialUsage={profile.usage}
        initialEvents={events}
        readonly={true}
      >
        <div className="space-y-6 sm:space-y-8">
          {/* Swipe Activity Chart */}
          <MasterActivityChart />

          {/* Funnel + Profile Overview + Messages in 2-column layout */}
          <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2">
            <TinderInsightsFunnel />

            {/* Right column: Stacked cards */}
            <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
              <ProfileOverview className="w-full" />
              <MessagesMetaCard />
            </div>
          </div>
        </div>
      </TinderProfileProvider>
    </div>
  );
}
