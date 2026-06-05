"use client";

import { useState, useMemo } from "react";
import { ImageOff, Layers, List, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { DisplayMode } from "@/app/app/profile-compare/[id]/provider-config";
import type { ProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { StackView } from "@/app/app/profile-compare/[id]/stack-view";
import { FlowView } from "@/app/app/profile-compare/[id]/flow-view";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";
import { FeedbackDialog } from "./feedback-dialog";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["getPublic"]["columns"][number];

interface ViewOnlyColumnProps {
  column: ComparisonColumn;
  providerConfig: ProviderConfig;
  defaultBio?: string;
  comparisonName?: string;
  profileName?: string;
  age?: number;
}

export function ViewOnlyColumn({
  column,
  providerConfig,
  defaultBio,
  profileName,
  age,
}: ViewOnlyColumnProps) {
  const trpc = useTRPC();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    providerConfig.defaultDisplayMode,
  );
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<
    string | undefined
  >();

  const hasContent = column.content.length > 0;
  const displayName = column.title || providerConfig.name;

  // Get all content IDs for this column
  const contentIds = useMemo(
    () => column.content.map((c) => c.id),
    [column.content],
  );

  // Fetch feedback for all content items in this column
  const { data: allFeedback = [] } = useQuery({
    ...trpc.profileCompare.getFeedback.queryOptions({
      columnId: column.id,
    }),
    enabled: contentIds.length > 0,
  });

  // Calculate feedback counts per content item
  const feedbackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFeedback.forEach((feedback) => {
      if (feedback.contentId) {
        counts[feedback.contentId] = (counts[feedback.contentId] || 0) + 1;
      }
    });
    return counts;
  }, [allFeedback]);

  const commentCount = allFeedback.length;

  const handleFeedbackClick = (contentId: string) => {
    setSelectedContentId(contentId);
    setFeedbackDialogOpen(true);
  };

  const openColumnFeedback = () => {
    setSelectedContentId(undefined);
    setFeedbackDialogOpen(true);
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
              onFeedbackClick={handleFeedbackClick}
              feedbackCounts={feedbackCounts}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="border-muted-foreground/20 flex aspect-[2/3] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center">
          <div className="bg-muted text-muted-foreground mb-4 rounded-full p-4">
            <ImageOff className="h-7 w-7" />
          </div>
          <p className="font-semibold">Nothing shared here yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {profileName ? `${profileName} hasn't` : "No one has"} added a{" "}
            {providerConfig.name} profile to this collection.
          </p>
        </div>
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

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        contentId={selectedContentId}
        columnId={column.id}
      />
    </div>
  );
}
