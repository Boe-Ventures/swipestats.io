"use client";

import { useTinderProfile } from "../../TinderProfileProvider";
import { useComparison } from "../../ComparisonProvider";
import { CompareMetricChart } from "./CompareMetricChart";
import { MatchRateCard } from "./MatchRateCard";
import { CohortBenchmarksCard } from "./CohortBenchmarksCard";
import { MatchRateComparisonChart } from "./MatchRateComparisonChart";
import { CompareMessagesMetaTable } from "./CompareMessagesMetaTable";
import { ProfileCards } from "./ProfileCards";
import { DataRequestCTAPlaceholder } from "./Placeholders";
import { SwipestatsPlusCard } from "./SwipestatsPlusCard";
import { UserFeedback } from "./UserFeedback";
import { DataRequestCTA } from "../../_components/DataRequestCTA";
import { DirectoryCTA } from "../../_components/DirectoryCTA";

export function CompareInsightsContent() {
  const { profile, usage, meta, tinderId } = useTinderProfile();
  const { comparisonProfiles } = useComparison();
  const profileWithUsage = { ...profile, usage };
  const profiles = [profileWithUsage, ...comparisonProfiles];

  if (!profile) {
    return <div>Loading...</div>;
  }

  const globalMeta = meta;
  const profileMeta = globalMeta;

  if (!profileMeta) {
    return <div>No profile metadata available</div>;
  }

  return (
    <main className="">
      {/* Profile comparison cards */}
      <div className="mb-8 flex justify-center">
        <ProfileCards />
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 gap-10">
        {/* Matches chart - full width */}
        <CompareMetricChart metric="matches" title="Matches" />

        {/* Row 4: Match Rate Comparison Chart + App Opens */}
        <div className="grid gap-10 md:grid-cols-2">
          <MatchRateComparisonChart />
          <CompareMetricChart metric="appOpens" title="App Opens" />
        </div>

        {/* Messages Meta Table */}
        <CompareMessagesMetaTable />

        {/* User Feedback */}
        {/* <UserFeedback tinderId={tinderId} /> */}

        {/* SwipestatsPlus */}
        <SwipestatsPlusCard tinderId={tinderId} />

        {/* Messages Sent/Received - 2 columns */}
        <div className="grid gap-10 md:grid-cols-2">
          <CompareMetricChart metric="messagesSent" title="Messages Sent" />
          <CompareMetricChart
            metric="messagesReceived"
            title="Messages Received"
          />
        </div>

        <DirectoryCTA />

        {/* Swipe Likes/Passes - 2 columns */}
        <div className="grid gap-10 md:grid-cols-2">
          <CompareMetricChart metric="swipeLikes" title="Swipe Likes" />
          <CompareMetricChart metric="swipePasses" title="Swipe Passes" />
        </div>

        <DataRequestCTA />

        {/* Row 3: Cohort Benchmarks + Match Rate Card */}
        {/* <div className="grid gap-10 md:grid-cols-2">
          <CohortBenchmarksCard />
          <MatchRateCard />
        </div>
        */}
      </div>
    </main>
  );
}
