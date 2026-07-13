"use client";

import { useMessages } from "../MessagesProvider";
import { MessagesMetaSection } from "./MessagesMetaSection";
import { ConversationReplaySection } from "./ConversationReplaySection";
import { MatchesList } from "./MatchesList";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MessagesPageContent() {
  const { loading, readonly } = useMessages();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (readonly) {
    return (
      <main className="bg-background min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation replay is private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Only the profile owner can view message activity and individual
                threads. Sign in with the account that uploaded this profile to
                continue.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
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
            See where you kept the conversation going, based on the messages you
            sent.
          </p>
        </div>

        <ConversationReplaySection />

        {/* Meta Statistics Section */}
        <MessagesMetaSection />

        {/* Matches List */}
        <MatchesList />
      </div>
    </main>
  );
}
