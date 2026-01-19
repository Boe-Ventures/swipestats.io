import { ComingSoonWrapper } from "@/components/ComingSoonWrapper";
import { MessagesProvider } from "./MessagesProvider";
import { MessagesPageContent } from "./_components/MessagesPageContent";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ tinderId: string }>;
}) {
  const { tinderId } = await params;

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-12 lg:px-8">
        <ComingSoonWrapper
          featureName="Messages & Conversations"
          description="Deep dive into your messaging patterns, see who you talked to most, and analyze your conversation success rate."
          topic="waitlist-message-analysis"
          benefits={[
            "Analyze your messaging behavior and patterns",
            "Identify your most active conversations",
            "Track response rates and engagement over time",
            "Discover what makes conversations successful",
          ]}
        >
          <MessagesProvider>
            <MessagesPageContent />
          </MessagesProvider>
        </ComingSoonWrapper>
      </div>
    </main>
  );
}
