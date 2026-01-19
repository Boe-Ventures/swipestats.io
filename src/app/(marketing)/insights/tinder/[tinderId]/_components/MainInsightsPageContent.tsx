"use client";

import { Share2, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";
import { DataRequestCTA } from "./DataRequestCTA";
import { DirectoryCtaCard } from "./DirectoryCtaCard";
import { MasterActivityChart } from "./charts/MasterActivityChart";
import { MessagesMetaCard } from "./MessagesMetaCard";
import { ProfileCompareCtaCard } from "./ProfileCompareCtaCard";
import { ProfileOverview } from "./ProfileOverview";
import { AddEventsCard } from "./AddEventsCard";
import { CompareCard } from "./CompareCard";
import { TinderInsightsFunnel } from "./TinderInsightsFunnel";
import { UpgradeAccountCTA } from "./UpgradeAccountCTA";
import NewsletterCTA from "../../../../NewsletterCTA";
import { SwipestatsPlusCard } from "../compare/_components/SwipestatsPlusCard";
import { MainInsightsSkeleton } from "./LoadingSkeletons";
import { CohortBenchmarksSection } from "./CohortBenchmarksSection";
// import { MasterCohortBenchmarkSection } from "./MasterCohortBenchmarkSection";
import { toast } from "sonner";
// import { CompareToOthersSection } from "./CompareToOthersSection"; // Deprecated: keeping component file for potential future use

export function MainInsightsPageContent() {
  const { usageLoading, tinderId, isOwner, isAnonymous } = useTinderProfile();

  const handleShare = async () => {
    const url = window.location.href;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My SwipeStats",
          text: "Check out my Tinder analytics!",
          url: url,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        // User cancelled or error - fallback to clipboard
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (usageLoading) {
    return <MainInsightsSkeleton />;
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your SwipeStats
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Profile insights and analytics
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <ButtonLink
              href={`/insights/tinder/${tinderId}/compare`}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </ButtonLink>
          </div>
        </div>

        {/* Row 2: Master Chart */}
        <MasterActivityChart />

        {/* Row 3: Funnel Visualization + Messages Meta Card */}
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <TinderInsightsFunnel />

          {/* Right column: Stacked placeholder cards */}
          <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
            <ProfileOverview className="w-full" />
            <MessagesMetaCard />
            <div className="grid w-full grid-cols-2 gap-4 sm:gap-6">
              <AddEventsCard />
              <CompareCard />
            </div>
          </div>
        </div>

        {/* Row 5: Upgrade CTA for anonymous owners */}
        {isAnonymous && isOwner && <UpgradeAccountCTA />}

        <SwipestatsPlusCard tinderId={tinderId} />

        {/* Master Performance Dashboard (Premium) */}
        {/* <MasterCohortBenchmarkSection /> */}

        {/* Row 4: Cohort Benchmarks with Period Selector */}
        <CohortBenchmarksSection />

        {/* Row 7: Data Request CTA */}
        <DataRequestCTA />
        {/* Row 6: Profile Compare CTA + Directory CTA */}
        <div className="grid gap-8 lg:grid-cols-2">
          <ProfileCompareCtaCard />
          <DirectoryCtaCard />
        </div>

        {/* Row 8: Newsletter CTA - always at the bottom */}
        <NewsletterCTA />
      </div>
    </main>
  );
}
