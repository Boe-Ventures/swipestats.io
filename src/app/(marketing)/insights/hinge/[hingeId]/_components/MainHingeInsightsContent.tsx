"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useHingeInsights } from "../HingeInsightsProvider";
import { ProfileOverview } from "./ProfileOverview";
import { ConversationStats } from "./ConversationStats";
import { MasterHingeActivityChart } from "./charts/MasterHingeActivityChart";
import { HingeInsightsSkeleton } from "./LoadingSkeletons";
import { HingeMessagesMetaCard } from "./HingeMessagesMetaCard";
import { DataRequestCTA } from "../../../_shared/DataRequestCTA";
import { DirectoryCtaCard } from "../../../_shared/DirectoryCtaCard";
import NewsletterCTA from "../../../../NewsletterCTA";

export function MainHingeInsightsContent() {
  const { usageLoading } = useHingeInsights();

  const handleShare = async () => {
    const url = window.location.href;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Hinge Stats",
          text: "Check out my Hinge analytics!",
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
    return <HingeInsightsSkeleton />;
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your Hinge Stats
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Insights from your Hinge dating experience
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
          </div>
        </div>

        {/* Activity Chart - Full Width */}
        <MasterHingeActivityChart />

        {/* Profile Overview and Conversation Stats */}
        <div className="grid gap-8 lg:grid-cols-2">
          <ProfileOverview />
          <ConversationStats />
        </div>

        {/* Messages Meta Card */}
        <HingeMessagesMetaCard />

        {/* Data Request CTA */}
        <DataRequestCTA />

        {/* Profile Compare CTA + Directory CTA */}
        <div className="grid gap-8 lg:grid-cols-2">
          <DirectoryCtaCard />
          <DirectoryCtaCard />
        </div>

        {/* Newsletter CTA - always at the bottom */}
        <NewsletterCTA />
      </div>
    </main>
  );
}
