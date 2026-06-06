import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { ProfileMeta } from "@/server/db/schema";

const roastOutputSchema = z.object({
  roastLines: z
    .array(z.string())
    .describe(
      "Around 10 (aim for 10, 8-12 is fine) witty, data-driven, self-deprecating roast lines about the user's dating app performance. Keep each under 140 characters.",
    ),
  realTalkInsights: z
    .array(z.string())
    .describe(
      "3-4 genuine, actionable insights to actually improve their dating app game",
    ),
  headline: z
    .string()
    .describe(
      "The single best one-liner from the roast — punchy, shareable, under 100 characters",
    ),
  overallScore: z
    .number()
    .int()
    .describe(
      "Overall dateability score from 0 to 100 (inclusive). Be honest but not cruel. The average user scores 35-55.",
    ),
});

export type RoastOutput = z.infer<typeof roastOutputSchema>;

export interface RoastInput {
  profileMeta: ProfileMeta;
  gender?: string;
  dataProvider?: string;
}

export async function generateRoast(input: RoastInput): Promise<RoastOutput> {
  const { profileMeta, gender, dataProvider = "Tinder" } = input;

  const matchRatePct = (profileMeta.matchRate * 100).toFixed(1);
  const likeRatePct = (profileMeta.likeRate * 100).toFixed(1);
  const ghostRatePct =
    profileMeta.conversationCount > 0
      ? (
          (profileMeta.ghostedCount / profileMeta.conversationCount) *
          100
        ).toFixed(1)
      : "0";
  const totalSwipes =
    profileMeta.swipeLikesTotal + profileMeta.swipePassesTotal;

  const prompt = `You are a roast comedian with a data science degree. You have access to someone's ${dataProvider} dating app statistics and your job is to roast them — humorously, data-driven, punchy. Keep it fun and self-deprecating, not mean-spirited.

Here are their stats:
- Total swipes: ${totalSwipes.toLocaleString()} (${profileMeta.swipeLikesTotal.toLocaleString()} likes, ${profileMeta.swipePassesTotal.toLocaleString()} passes)
- Like rate (how often they swipe right): ${likeRatePct}%
- Match rate (matches per like sent): ${matchRatePct}%
- Total matches: ${profileMeta.matchesTotal.toLocaleString()}
- Days active on app: ${profileMeta.daysActive}
- Swipes per active day: ${profileMeta.swipesPerDay.toFixed(1)}
- Total app opens: ${profileMeta.appOpensTotal.toLocaleString()}
- Messages sent: ${profileMeta.messagesSentTotal.toLocaleString()}
- Messages received: ${profileMeta.messagesReceivedTotal.toLocaleString()}
- Conversations started: ${profileMeta.conversationsWithMessages}
- Ghosted matches (no messages ever): ${profileMeta.ghostedCount} (${ghostRatePct}% ghost rate)
- Avg messages per conversation: ${profileMeta.averageMessagesPerConversation?.toFixed(1) ?? "N/A"}
${gender ? `- Gender: ${gender}` : ""}

Roast rules:
1. Reference specific numbers — that's what makes it sting (lovingly)
2. Draw absurd but accurate conclusions from the data
3. Compare to relatable everyday things (e.g., "you've spent more time on ${dataProvider} than...")
4. Keep each line under 140 characters
5. Vary the angle: some about pickiness, some about match rate, some about ghosting, some about app addiction
6. End with the darkest-but-funniest one for the headline

For the "Real Talk" insights, be genuinely helpful — what would actually move the needle for someone with these stats?`;

  const result = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    schema: roastOutputSchema,
    prompt,
    temperature: 0.9,
  });

  return result.object;
}
