"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ViewOnlyColumn } from "./view-only-column";
import { FeedbackTray } from "./feedback-tray";
import { ComposeProfileCard } from "./compose-profile-card";
import { AnonymousNamePrompt } from "./anonymous-name-prompt";
import { ShareFooter, ShareNotFound } from "@/components/share/share-shell";

export default function SharedComparisonPage() {
  const params = useParams<{ shareKey: string }>();
  const shareKey = params.shareKey;
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const trpc = useTRPC();

  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const { data: comparison, isLoading } = useQuery(
    trpc.profileCompare.getPublic.queryOptions({
      shareKey,
    }),
  );

  // Show name prompt on load if user has no session
  useEffect(() => {
    if (!isLoading && !isSessionLoading) {
      if (session?.user) {
        // Close prompt if session exists
        setShowNamePrompt(false);
      } else {
        // Show prompt if no session
        setShowNamePrompt(true);
      }
    }
  }, [isLoading, isSessionLoading, session]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        {/* Header Skeleton */}
        <header className="from-muted/30 to-background border-b bg-linear-to-b">
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
      <ShareNotFound
        title="Comparison not found"
        description="This comparison may have been deleted or is no longer public."
      />
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
        <header className="from-muted/30 to-background border-b bg-linear-to-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {comparison.name || "Profile Comparison"}
                  </h1>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  {comparison.profileName && (
                    <span className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-rose-500 text-[11px] text-white">
                          {comparison.profileName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground font-medium">
                        {comparison.profileName}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    Shared via SwipeStats ·{" "}
                    {formatDistanceToNow(new Date(comparison.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
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
              <Link href="https://www.swipestats.io" target="_blank">
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

        {/* Main Content — extra bottom padding leaves room for the sticky tray */}
        <main className="container mx-auto px-4 py-8 pb-28">
          {/* Desktop: Side-by-side columns */}
          <div className="hidden gap-6 md:grid-cols-2 lg:grid lg:grid-cols-4">
            {comparison.columns.map((column) => {
              const providerConfig = getProviderConfig(column.dataProvider);
              return (
                <ViewOnlyColumn
                  key={column.id}
                  column={column}
                  comparisonId={comparison.id}
                  shareKey={shareKey}
                  providerConfig={providerConfig}
                  defaultBio={displayBio}
                  profileName={comparison.profileName || undefined}
                  age={comparison.age || undefined}
                />
              );
            })}
            {/* Always-present CTA to compose another version */}
            <ComposeProfileCard
              shareKey={shareKey}
              profileName={comparison.profileName || undefined}
            />
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
                </TabsList>
                {comparison.columns.map((column) => {
                  const providerConfig = getProviderConfig(column.dataProvider);
                  return (
                    <TabsContent key={column.id} value={column.id}>
                      <ViewOnlyColumn
                        column={column}
                        comparisonId={comparison.id}
                        shareKey={shareKey}
                        providerConfig={providerConfig}
                        defaultBio={displayBio}
                        profileName={comparison.profileName || undefined}
                        age={comparison.age || undefined}
                      />
                    </TabsContent>
                  );
                })}
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

            {/* Always-present CTA to compose another version */}
            <div className="mt-6">
              <ComposeProfileCard
                shareKey={shareKey}
                profileName={comparison.profileName || undefined}
                fullWidth
              />
            </div>
          </div>
        </main>

        {/* Sticky feedback tray */}
        <FeedbackTray comparison={comparison} />

        {/* Footer — extra bottom padding clears the sticky tray */}
        <ShareFooter className="pb-28" />
      </div>
    </>
  );
}
