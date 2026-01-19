import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { trpcApi } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { InsightsProvider } from "../InsightsProvider";
import { TinderInsightsFunnel } from "../_components/TinderInsightsFunnel";
import { CompleteYourOutcomes } from "../_components/CompleteYourOutcomes";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ tinderId: string }>;
}) {
  const { tinderId } = await params;

  // Fetch basic profile on server (fast, no usage data)
  const caller = await trpcApi();
  const profile = await caller.profile.get({ tinderId });

  if (!profile) {
    notFound();
  }

  return (
    <InsightsProvider myTinderId={tinderId} myTinderProfile={profile}>
      <main className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 lg:px-8">
          {/* Back Button */}
          <Link href={`/insights/tinder/${tinderId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Insights
            </Button>
          </Link>

          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight">
              Your Dating Journey
            </h1>
            <p className="text-muted-foreground text-lg">
              Visualize your complete path from swipes to relationships
            </p>
          </div>

          {/* TinderInsights-style Funnel */}
          <TinderInsightsFunnel />

          {/* Outcomes Card */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CompleteYourOutcomes tinderProfileId={tinderId} />

            {/* Info Card */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="mb-4 text-lg font-semibold">
                Understanding Your Journey
              </h3>
              <div className="text-muted-foreground space-y-3 text-sm">
                <p>
                  This Sankey diagram visualizes the flow of your dating
                  experience from initial swipes through to meaningful outcomes.
                </p>
                <p>
                  The width of each flow represents the number of people at that
                  stage, making it easy to see where the biggest drop-offs
                  occur.
                </p>
                <p>
                  Add your real-world outcomes to see the complete picture
                  beyond what the app tracks automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </InsightsProvider>
  );
}
