"use client";

import { Share2, BarChart3 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { toast } from "sonner";
import { useComparison } from "../../ComparisonProvider";
import { useTinderProfile } from "../../TinderProfileProvider";
import { CompareInsightsContent } from "./CompareInsightsContent";
import { CompareInsightsSkeleton } from "../../_components/LoadingSkeletons";

export function CompareInsightsPageContent() {
  const { loading } = useComparison();
  const { tinderId } = useTinderProfile();

  const handleShare = async () => {
    const url = window.location.href;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My SwipeStats Comparison",
          text: "Check out my Tinder profile comparison!",
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

  if (loading) {
    return <CompareInsightsSkeleton />;
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">
              Compare Profiles
            </h1>
            <p className="text-muted-foreground text-lg">
              Side-by-side comparison of multiple Tinder profiles
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
              variant="outline"
              size="sm"
              href={`/insights/tinder/${tinderId}`}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Main Insights</span>
            </ButtonLink>
          </div>
        </div>
        <CompareInsightsContent />
      </div>
    </main>
  );
}
