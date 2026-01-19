"use client";

import { useState, useMemo } from "react";
import { Layers, List } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import type { DisplayMode } from "@/app/app/profile-compare/[id]/provider-config";
import type { ProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { StackView } from "@/app/app/profile-compare/[id]/stack-view";
import { FlowView } from "@/app/app/profile-compare/[id]/flow-view";
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

  const handleFeedbackClick = (contentId: string) => {
    setSelectedContentId(contentId);
    setFeedbackDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Badge
              variant="secondary"
              style={{
                backgroundColor: `${providerConfig.brandColor}22`,
                color: providerConfig.brandColor,
                borderColor: `${providerConfig.brandColor}44`,
              }}
            >
              {column.title || column.dataProvider}
            </Badge>
          </CardTitle>
        </div>
        <CardDescription>
          {column.content.length}{" "}
          {column.content.length === 1 ? "item" : "items"}
          {column.title && (
            <span className="text-muted-foreground ml-1">
              • {column.dataProvider}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Display Mode Selector */}
        <div>
          <Label className="mb-2 block text-sm font-medium">View Mode</Label>
          <Tabs
            value={displayMode}
            onValueChange={(v) => setDisplayMode(v as DisplayMode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stack" className="text-xs">
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Stack
              </TabsTrigger>
              <TabsTrigger value="flow" className="text-xs">
                <List className="mr-1.5 h-3.5 w-3.5" />
                Flow
              </TabsTrigger>
              {/* <TabsTrigger value="platform" disabled className="text-xs">
                <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                Platform
              </TabsTrigger> */}
            </TabsList>

            {/* Stack View */}
            <TabsContent value="stack" className="mt-4">
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

            {/* Flow View */}
            <TabsContent value="flow" className="mt-4">
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

            {/* Platform View (V3) - Coming Soon */}
            {/* <TabsContent value="platform" className="mt-4">
              <div className="bg-muted/50 flex aspect-[9/16] flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
                <Smartphone className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground mb-2 font-medium">
                  Platform View
                </p>
                <p className="text-muted-foreground text-sm">
                  Pixel-perfect {providerConfig.name} UI recreation coming soon
                </p>
              </div>
            </TabsContent> */}
          </Tabs>
        </div>
      </CardContent>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        contentId={selectedContentId}
        columnId={column.id}
      />
    </Card>
  );
}
