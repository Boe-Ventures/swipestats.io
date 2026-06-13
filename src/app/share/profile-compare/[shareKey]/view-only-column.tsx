"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import {
  ArrowRight,
  ImageOff,
  Layers,
  List,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import type { EducationLevel } from "@/server/db/schema";
import { useQuery } from "@tanstack/react-query";
import { readPhotoAnalysis } from "@/lib/photo-analysis";
import type { DisplayMode } from "@/app/app/profile-compare/[id]/provider-config";
import type { ProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { StackView } from "@/app/app/profile-compare/[id]/stack-view";
import { FlowView } from "@/app/app/profile-compare/[id]/flow-view";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";
import { RoastCtaStrip } from "@/components/roast/roast-cta-strip";
import { FeedbackDialog } from "./feedback-dialog";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["getPublic"]["columns"][number];

interface ViewOnlyColumnProps {
  column: ComparisonColumn;
  comparisonId: string;
  shareKey: string;
  providerConfig: ProviderConfig;
  defaultBio?: string;
  profileName?: string;
  age?: number;
  heightCm?: number;
  educationLevel?: EducationLevel;
  hometown?: string;
  city?: string;
  nationality?: string;
}

export function ViewOnlyColumn({
  column,
  comparisonId,
  shareKey,
  providerConfig,
  defaultBio,
  profileName,
  age,
  heightCm,
  educationLevel,
  hometown,
  city,
  nationality,
}: ViewOnlyColumnProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    providerConfig.defaultDisplayMode,
  );

  // Owner-published roast for this column (publishing the comparison and the
  // roast are separate consent bits; this is only set when both are public).
  const publishedRoast = column.publishedRoast;

  // The feedback target (a content id or this column's id) lives in the URL,
  // so a feedback dialog is deep-linkable and survives reload. Every column
  // shares the one param; only the column that owns the id opens its dialog.
  const [feedbackTarget, setFeedbackTarget] = useQueryState("feedback");

  const hasContent = column.content.length > 0;
  const displayName = column.title || providerConfig.name;

  const selectedContent = column.content.find((c) => c.id === feedbackTarget);
  const feedbackOpen = feedbackTarget === column.id || !!selectedContent;

  // Header context for the dialog — derived here because the column already
  // owns its content; nothing needs to be threaded through Stack/Flow views.
  const feedbackContext = useMemo(() => {
    if (!selectedContent) return undefined;
    const position = column.content.indexOf(selectedContent) + 1;
    if (selectedContent.type === "photo") {
      return {
        imageUrl: selectedContent.attachment?.url,
        title: `${displayName} · Photo ${position}`,
        subtitle:
          selectedContent.caption ??
          readPhotoAnalysis(selectedContent.attachment?.metadata)?.name,
      };
    }
    return {
      title: `${displayName} · Prompt`,
      subtitle: selectedContent.prompt ?? undefined,
    };
  }, [selectedContent, column.content, displayName]);

  // Get all content IDs for this column
  const contentIds = useMemo(
    () => column.content.map((c) => c.id),
    [column.content],
  );

  // Fetch the aggregate comparison feed so content-level comments can be
  // counted without issuing one request per content item.
  const { data: allFeedback = [] } = useQuery({
    ...trpc.profileCompare.getFeedback.queryOptions({
      comparisonId,
    }),
    enabled: !!comparisonId,
  });

  // Calculate feedback counts per content item
  const feedbackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const contentIdSet = new Set(contentIds);
    allFeedback.forEach((feedback) => {
      if (feedback.contentId && contentIdSet.has(feedback.contentId)) {
        counts[feedback.contentId] = (counts[feedback.contentId] || 0) + 1;
      }
    });
    return counts;
  }, [allFeedback, contentIds]);

  const commentCount = useMemo(() => {
    const contentIdSet = new Set(contentIds);
    return allFeedback.filter(
      (feedback) =>
        feedback.columnId === column.id ||
        (feedback.contentId && contentIdSet.has(feedback.contentId)),
    ).length;
  }, [allFeedback, column.id, contentIds]);

  const handleFeedbackClick = (contentId: string) => {
    void setFeedbackTarget(contentId);
  };

  const openColumnFeedback = () => {
    void setFeedbackTarget(column.id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header: identity on the left, view toggle on the right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ProviderIconChip config={providerConfig} />
          <span className="truncate text-base font-semibold">
            {displayName}
          </span>
          <span className="text-muted-foreground shrink-0 text-sm">
            · {column.content.length}
          </span>
        </div>

        {hasContent && (
          <Tabs
            value={displayMode}
            onValueChange={(v) => setDisplayMode(v as DisplayMode)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="stack" className="text-xs">
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Stack
              </TabsTrigger>
              <TabsTrigger value="flow" className="text-xs">
                <List className="mr-1.5 h-3.5 w-3.5" />
                Flow
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Body: phone preview is the hero, no card chrome around it */}
      {hasContent ? (
        <Tabs value={displayMode}>
          <TabsContent value="stack" className="mt-0">
            <StackView
              column={column}
              providerConfig={providerConfig}
              defaultBio={defaultBio}
              profileName={profileName}
              age={age}
              city={city}
              educationLevel={educationLevel}
              hometown={hometown}
              onFeedbackClick={handleFeedbackClick}
              feedbackCounts={feedbackCounts}
            />
          </TabsContent>
          <TabsContent value="flow" className="mt-0">
            <FlowView
              column={column}
              providerConfig={providerConfig}
              defaultBio={defaultBio}
              profileName={profileName}
              age={age}
              heightCm={heightCm}
              educationLevel={educationLevel}
              hometown={hometown}
              city={city}
              nationality={nationality}
              onFeedbackClick={handleFeedbackClick}
              feedbackCounts={feedbackCounts}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Link
          href={`/share/create/${shareKey}`}
          className="border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 group flex aspect-[2/3] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors"
        >
          <div className="bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground mb-4 rounded-full p-4 transition-colors">
            <ImageOff className="h-7 w-7" />
          </div>
          <p className="font-semibold">No {providerConfig.name} profile yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Build one from {profileName ? `${profileName}'s` : "their"} photos
            and show how it should look.
          </p>
          <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
            Make your own version
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Per-column comment affordance */}
      <Button
        variant="outline"
        size="sm"
        className="w-fit rounded-full"
        onClick={openColumnFeedback}
      >
        <MessageCircle className="mr-1.5 h-4 w-4" />
        Comment
        {commentCount > 0 && (
          <span className="text-muted-foreground ml-1">· {commentCount}</span>
        )}
      </Button>

      {/* Published roast teaser — deliberately below the profile and comment
          affordances so friends form their own take before reading the AI's. */}
      {publishedRoast && (
        <RoastCtaStrip
          title="The AI roasted this profile"
          description={publishedRoast.tagline}
          actionLabel="Read it"
          onClick={() =>
            router.push(`/share/profile-roast/${publishedRoast.shareKey}`)
          }
        />
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={(open) => {
          if (!open) void setFeedbackTarget(null);
        }}
        contentId={selectedContent?.id}
        columnId={column.id}
        comparisonId={comparisonId}
        profileName={profileName}
        context={feedbackContext}
      />
    </div>
  );
}
