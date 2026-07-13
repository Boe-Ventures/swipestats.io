"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouterOutputs } from "@/trpc/react";
import {
  CalendarDays,
  MessageSquareText,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { useMessages } from "../MessagesProvider";

type ReplayMetric = NonNullable<
  RouterOutputs["match"]["getConversationReplay"]["highlights"]["mostMessages"]
>;

type HighlightCardProps = {
  title: string;
  description: string;
  metric: ReplayMetric | null;
  value: (metric: ReplayMetric) => string;
  icon: typeof MessageSquareText;
};

function HighlightCard({
  title,
  description,
  metric,
  value,
  icon: Icon,
}: HighlightCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {title}
          </p>
          <CardTitle className="text-xl">
            {metric ? `Match #${metric.matchOrder}` : "Not enough data"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold tabular-nums">
          {metric ? value(metric) : "—"}
        </p>
        <p className="text-muted-foreground text-sm">
          {metric
            ? `${metric.messageCount} sent across ${metric.activeDays} active ${metric.activeDays === 1 ? "day" : "days"}`
            : description}
        </p>
      </CardContent>
    </Card>
  );
}

export function ConversationReplaySection() {
  const { replay } = useMessages();

  if (!replay || replay.conversationCount === 0) return null;

  const comparison = replay.openerComparison;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">Conversation replay</h2>
            <Badge variant="secondary">No AI needed</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">
            Your export contains your outgoing messages, not the other
            person&apos;s replies. These are momentum signals from your
            behavior—not proof of replies, chemistry, or success.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HighlightCard
          title="Most messages"
          description="No conversations with sent messages"
          metric={replay.highlights.mostMessages}
          value={(metric) => `${metric.messageCount} sent`}
          icon={MessageSquareText}
        />
        <HighlightCard
          title="Longest-running"
          description="No multi-message conversations yet"
          metric={replay.highlights.longestRunning}
          value={(metric) =>
            metric.durationDays === 0
              ? "Same day"
              : `${metric.durationDays} ${metric.durationDays === 1 ? "day" : "days"}`
          }
          icon={CalendarDays}
        />
        <HighlightCard
          title="Most revisited"
          description="No conversations revisited yet"
          metric={replay.highlights.mostRevisited}
          value={(metric) =>
            `${metric.activeDays} active ${metric.activeDays === 1 ? "day" : "days"}`
          }
          icon={RotateCcw}
        />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-5" />
            <CardTitle className="text-lg">
              What your openers have in common
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {comparison ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {comparison.sustained.questionRate}%
                  <span className="text-muted-foreground mx-2 text-lg font-normal">
                    vs
                  </span>
                  {comparison.oneMessage.questionRate}%
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  started with a question in sustained vs one-message chats
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {comparison.sustained.averageLength}
                  <span className="text-muted-foreground mx-2 text-lg font-normal">
                    vs
                  </span>
                  {comparison.oneMessage.averageLength}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  average opener characters in the same two groups
                </p>
              </div>
              <p className="text-muted-foreground text-xs sm:col-span-2">
                Sustained means at least 5 messages sent or activity on 2+ days.
                Based on {comparison.sustained.sampleSize} sustained and{" "}
                {comparison.oneMessage.sampleSize} one-message openers. This is
                an association, not a claim that the opener caused the outcome.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              We need at least one text opener in both a sustained chat and a
              one-message chat before making a useful comparison.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
