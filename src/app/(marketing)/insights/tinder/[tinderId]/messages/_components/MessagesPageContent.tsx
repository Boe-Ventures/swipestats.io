"use client";

import { useMessages } from "../MessagesProvider";
import { MessagesMetaSection } from "./MessagesMetaSection";
import { MatchesList } from "./MatchesList";
import { Loader2 } from "lucide-react";

export function MessagesPageContent() {
  const { loading } = useMessages();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Messages & Conversations
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Explore your messaging patterns and conversations
          </p>
        </div>

        {/* Meta Statistics Section */}
        <MessagesMetaSection />

        {/* Matches List */}
        <MatchesList />
      </div>
    </main>
  );
}
