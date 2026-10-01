"use client";

import { BarChart3 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { useComparison } from "../../ComparisonProvider";
import { useTinderProfile } from "../../TinderProfileProvider";
import { CompareInsightsContent } from "./CompareInsightsContent";
import { CompareInsightsSkeleton } from "../../_components/LoadingSkeletons";

export function CompareInsightsPageContent() {
  const { loading } = useComparison();
  const { tinderId } = useTinderProfile();

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
            <ShareButton
              title="My SwipeStats Comparison"
              text="Check out my Tinder profile comparison!"
            />
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
