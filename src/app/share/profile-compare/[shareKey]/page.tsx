"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ViewOnlyColumn } from "./view-only-column";
import { FeedbackSummary } from "./feedback-summary";
import { AnonymousNamePrompt } from "./anonymous-name-prompt";

export default function SharedComparisonPage() {
  const params = useParams<{ shareKey: string }>();
  const shareKey = params.shareKey;
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const trpc = useTRPC();

  const { data: session } = authClient.useSession();
  const { data: comparison, isLoading } = useQuery(
    trpc.profileCompare.getPublic.queryOptions({
      shareKey,
    }),
  );

  // Show name prompt on load if user has no session
  useEffect(() => {
    if (!isLoading) {
      if (session?.user) {
        // Close prompt if session exists
        setShowNamePrompt(false);
      } else {
        // Show prompt if no session
        setShowNamePrompt(true);
      }
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        {/* Header Skeleton */}
        <header className="from-muted/30 to-background border-b bg-gradient-to-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
        </header>

        {/* Content Skeleton */}
        <div className="container mx-auto px-4 py-8">
          {/* Desktop skeleton */}
          <div className="hidden gap-6 md:grid-cols-2 lg:grid lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[600px]" />
            ))}
          </div>
          {/* Mobile skeleton */}
          <div className="lg:hidden">
            <Skeleton className="mb-4 h-10 w-full" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Comparison not found</h2>
          <p className="text-muted-foreground mt-2">
            This comparison may have been deleted or is no longer public.
          </p>
          <Link href="https://swipestats.io" className="mt-4 inline-block">
            <Button>Go to SwipeStats</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayBio = comparison.defaultBio || "";

  return (
    <>
      <AnonymousNamePrompt
        open={showNamePrompt}
        onOpenChange={setShowNamePrompt}
        onSuccess={() => {
          // Refresh session after successful name update
          void authClient.getSession();
        }}
      />
      <div className="bg-background min-h-screen">
        {/* Header */}
        <header className="from-muted/30 to-background border-b bg-gradient-to-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {comparison.name || "Profile Comparison"}
                  </h1>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">🔗</span>
                    Shared via SwipeStats
                  </span>
                  {comparison.profileName && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs">👤</span>
                      {comparison.profileName}
                    </span>
                  )}
                  {comparison.age && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs">🎂</span>
                      {comparison.age} years old
                    </span>
                  )}
                  {(comparison.city ||
                    comparison.state ||
                    comparison.country) && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs">📍</span>
                      {[comparison.city, comparison.state, comparison.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <Link href="https://swipestats.io" target="_blank">
                <Button
                  variant="default"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Create Your Own
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Desktop: Side-by-side columns */}
          <div className="hidden gap-6 md:grid-cols-2 lg:grid lg:grid-cols-4">
            {comparison.columns.map((column) => {
              const providerConfig = getProviderConfig(column.dataProvider);
              return (
                <ViewOnlyColumn
                  key={column.id}
                  column={column}
                  providerConfig={providerConfig}
                  defaultBio={displayBio}
                  comparisonName={comparison.name || undefined}
                  profileName={comparison.profileName || undefined}
                  age={comparison.age || undefined}
                />
              );
            })}
            {/* Feedback Summary Column */}
            <FeedbackSummary comparison={comparison} />
          </div>

          {/* Mobile: Tabs */}
          <div className="lg:hidden">
            {comparison.columns.length > 0 ? (
              <Tabs defaultValue={comparison.columns[0]!.id}>
                <TabsList className="w-full">
                  {comparison.columns.map((column) => (
                    <TabsTrigger
                      key={column.id}
                      value={column.id}
                      className="flex-1"
                    >
                      {column.title || column.dataProvider}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="feedback-summary" className="flex-1">
                    Summary
                  </TabsTrigger>
                </TabsList>
                {comparison.columns.map((column) => {
                  const providerConfig = getProviderConfig(column.dataProvider);
                  return (
                    <TabsContent key={column.id} value={column.id}>
                      <ViewOnlyColumn
                        column={column}
                        providerConfig={providerConfig}
                        defaultBio={displayBio}
                        comparisonName={comparison.name || undefined}
                        profileName={comparison.profileName || undefined}
                        age={comparison.age || undefined}
                      />
                    </TabsContent>
                  );
                })}
                <TabsContent value="feedback-summary">
                  <FeedbackSummary comparison={comparison} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="border-muted-foreground/25 flex items-center justify-center rounded-lg border-2 border-dashed py-12">
                <div className="text-center">
                  <p className="text-muted-foreground font-medium">
                    No columns to display
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground text-sm">
              Created with{" "}
              <Link
                href="https://swipestats.io"
                className="font-semibold hover:underline"
              >
                SwipeStats
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
