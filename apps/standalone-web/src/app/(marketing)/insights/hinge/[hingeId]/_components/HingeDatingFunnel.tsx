"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHingeInsights } from "../HingeInsightsProvider";
import { getHingeLifecycleStats } from "@/lib/utils/hingeLifecycleStats";

interface MetricRowProps {
  label: string;
  value: string | number;
  description?: string;
}

function MetricRow({ label, value, description }: MetricRowProps) {
  return (
    <div className="border-border flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function HingeDatingFunnel() {
  const { profile, interactions } = useHingeInsights();

  if (!profile?.matches) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hinge Lifecycle</CardTitle>
          <CardDescription>
            How Hinge export events map to your profile activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const stats = getHingeLifecycleStats(interactions, profile.matches);
  const outboundMatchRate = `${(stats.outboundMatchRate * 100).toFixed(1)}%`;
  const conversationRate = `${(stats.conversationRate * 100).toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hinge Lifecycle</CardTitle>
        <CardDescription>
          Separated by outbound likes, inbound accepted likes, and removals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-3">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Outbound</h4>
            <MetricRow label="Likes sent" value={stats.likesSent} />
            <MetricRow
              label="Matched from your likes"
              value={stats.outboundMatches}
              description={`${outboundMatchRate} of sent likes`}
            />
            <MetricRow
              label="Still unmatched"
              value={stats.pendingOutboundLikes}
              description="Sent likes with no match in the export"
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Inbound</h4>
            <MetricRow
              label="Accepted incoming likes"
              value={stats.inboundMatches}
              description="Matches explicitly marked as incoming"
            />
            {stats.unclassifiedOriginMatches > 0 && (
              <MetricRow
                label="Direction unavailable"
                value={stats.unclassifiedOriginMatches}
                description={`${Math.round(stats.originClassificationCoverage * 100)}% of match directions classified`}
              />
            )}
            <MetricRow
              label="Removed before match"
              value={stats.removedWithoutMatch}
              description="Hinge records these as remove events"
            />
            <MetricRow
              label="Unmatched after match"
              value={stats.unmatchedAfterMatch}
            />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Conversation</h4>
            <MetricRow label="Mutual matches" value={stats.totalMatches} />
            <MetricRow
              label="Matches you messaged"
              value={stats.conversationsWithUserMessages}
              description={`${conversationRate} of mutual matches`}
            />
            <MetricRow label="Messages sent" value={stats.messagesSent} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
