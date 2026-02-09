import { formatDistance } from "date-fns";
import { nanoid } from "nanoid";
import type { ConversationThread } from "@/lib/interfaces/HingeDataJSON";
import type {
  MatchInsert,
  MessageInsert,
  HingeInteractionInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";

/**
 * Get the earliest timestamp from a conversation thread
 */
function getEarliestTimestamp(thread: ConversationThread): Date | undefined {
  const timestamps: Date[] = [];

  if (thread.like?.[0]?.timestamp) {
    timestamps.push(new Date(thread.like[0].timestamp));
  }
  if (thread.match?.[0]?.timestamp) {
    timestamps.push(new Date(thread.match[0].timestamp));
  }
  if (thread.chats?.[0]?.timestamp) {
    timestamps.push(new Date(thread.chats[0].timestamp));
  }

  return timestamps.length > 0
    ? new Date(Math.min(...timestamps.map((d) => d.getTime())))
    : undefined;
}

/**
 * Get the latest timestamp from a conversation thread
 */
function getLatestTimestamp(thread: ConversationThread): Date | undefined {
  const timestamps: Date[] = [];

  if (Array.isArray(thread.chats) && thread.chats.length > 0) {
    const lastChat = thread.chats[thread.chats.length - 1];
    if (lastChat?.timestamp) {
      timestamps.push(new Date(lastChat.timestamp));
    }
  }

  if (thread.match?.[0]?.timestamp) {
    timestamps.push(new Date(thread.match[0].timestamp));
  }

  if (thread.we_met?.[0]?.timestamp) {
    timestamps.push(new Date(thread.we_met[0].timestamp));
  }

  return timestamps.length > 0
    ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
    : undefined;
}

/**
 * Transform Hinge conversation threads into database inserts
 *
 * GDPR Data Model:
 * - like[] = You liked someone (LIKE_SENT interaction)
 * - match[] = Mutual match occurred (match record)
 * - block[] = You rejected or unmatched someone (REJECT or UNMATCH interaction)
 * - chats[] = Messages YOU sent (all outgoing)
 */
export function createHingeMessagesAndMatches(
  conversations: ConversationThread[],
  hingeProfileId: string,
): {
  interactionsInput: HingeInteractionInsert[];
  matchesInput: MatchInsert[];
  messagesInput: MessageInsert[];
} {
  console.log(
    `   💬 Processing ${conversations.length} Hinge conversations...`,
  );

  const interactionsInput: HingeInteractionInsert[] = [];
  const matchesInput: MatchInsert[] = [];
  const messagesInput: MessageInsert[] = [];

  conversations.forEach((thread, i) => {
    try {
      const likeEntry =
        Array.isArray(thread.like) && thread.like.length > 0
          ? thread.like[0]
          : undefined;
      const matchEntry =
        Array.isArray(thread.match) && thread.match.length > 0
          ? thread.match[0]
          : undefined;
      const hasBlock = Array.isArray(thread.block) && thread.block.length > 0;

      let matchId: string | null = null;

      // 1. Process LIKE_SENT interaction (if you liked someone)
      if (likeEntry) {
        const likeComment = likeEntry.like?.[0]?.comment;

        // Generate matchId if this like resulted in a match
        if (matchEntry) {
          matchId = nanoid();
        }

        interactionsInput.push({
          id: createId("hint"),
          type: "LIKE_SENT",
          timestamp: new Date(likeEntry.timestamp),
          timestampRaw: likeEntry.timestamp,
          comment: likeComment ?? null,
          hasComment: !!likeComment,
          matchId,
          hingeProfileId,
        });
      }

      // 2. Process MATCH (only if mutual match occurred)
      if (matchEntry) {
        // If we didn't generate matchId above (no like, so they initiated), generate it now
        matchId ??= nanoid();

        const totalMessageCount = thread.chats?.length ?? 0;
        const firstMessageAt = getEarliestTimestamp(thread);
        const lastMessageAt = getLatestTimestamp(thread);
        const weMetData = thread.we_met?.[0];

        matchesInput.push({
          id: matchId,
          order: i,
          totalMessageCount,
          textCount: totalMessageCount,
          gifCount: 0,
          gestureCount: 0,
          otherMessageTypeCount: 0,
          primaryLanguage: null,
          languages: [],
          initialMessageAt: firstMessageAt,
          lastMessageAt: lastMessageAt,
          engagementScore: null,
          tinderMatchId: null,
          tinderProfileId: null,
          hingeProfileId,
          weMet: weMetData
            ? { did_meet_subject: weMetData.did_meet_subject }
            : null,
          like: null, // Not storing like data in match table anymore
          match: { timestamp: matchEntry.timestamp },
          likedAt: null,
          matchedAt: new Date(matchEntry.timestamp),
        });

        // Create MATCH interaction
        interactionsInput.push({
          id: createId("hint"),
          type: "MATCH",
          timestamp: new Date(matchEntry.timestamp),
          timestampRaw: matchEntry.timestamp,
          comment: null,
          hasComment: false,
          matchId,
          hingeProfileId,
        });
      }

      // 3. Process MESSAGES (only for matched conversations)
      if (
        matchEntry &&
        Array.isArray(thread.chats) &&
        thread.chats.length > 0
      ) {
        // Create a map of voice note URLs by timestamp for quick lookup
        const voiceNotesByTimestamp = new Map<string, string>();
        if (Array.isArray(thread.voice_notes)) {
          thread.voice_notes.forEach((vn) => {
            if (vn.timestamp && vn.url) {
              voiceNotesByTimestamp.set(vn.timestamp, vn.url);
            }
          });
        }

        thread.chats.forEach((chat, messageIndex) => {
          const lastMessage = thread.chats![messageIndex - 1];

          const currentTimestamp = new Date(chat.timestamp).getTime();
          const lastTimestamp = lastMessage
            ? new Date(lastMessage.timestamp).getTime()
            : undefined;

          const timeSinceLastMessage = lastTimestamp
            ? Math.floor((currentTimestamp - lastTimestamp) / 1000)
            : 0;

          // Check if this is a voice note (has timestamp but no body)
          const voiceNoteUrl = !chat.body
            ? voiceNotesByTimestamp.get(chat.timestamp)
            : null;

          // Determine message type and content
          let messageType: "TEXT" | "VOICE_NOTE" = "TEXT";
          let content = chat.body || "";
          let gifUrl: string | null = null;

          if (voiceNoteUrl) {
            messageType = "VOICE_NOTE";
            content = "[Voice Note]";
            gifUrl = voiceNoteUrl;
          } else if (!chat.body) {
            // Message with no body and no matching voice note - skip it
            console.log(
              `   ⚠️  Skipping message without body at conversation ${i}, message ${messageIndex}`,
            );
            return;
          }

          // GDPR data only contains YOUR messages - all are outgoing
          messagesInput.push({
            id: nanoid(),
            messageType,
            to: 1, // Always 1 for Hinge (sent by user)
            sentDate: new Date(chat.timestamp),
            sentDateRaw: chat.timestamp,
            content,
            charCount: content.length,
            contentRaw: content,
            type: voiceNoteUrl ? "voice_note" : undefined,
            gifUrl,
            matchId: matchId!,
            tinderProfileId: null,
            hingeProfileId,
            order: messageIndex,
            timeSinceLastMessage,
            timeSinceLastMessageRelative: lastTimestamp
              ? formatDistance(lastTimestamp, currentTimestamp)
              : null,
            language: null,
            emotionScore: null,
            contentSanitized: null,
          });

          // Create MESSAGE_SENT interaction
          interactionsInput.push({
            id: createId("hint"),
            type: "MESSAGE_SENT",
            timestamp: new Date(chat.timestamp),
            timestampRaw: chat.timestamp,
            comment: null,
            hasComment: false,
            matchId: matchId!,
            hingeProfileId,
          });
        });
      }

      // 4. Process BLOCK interactions (REJECT or UNMATCH)
      if (hasBlock && thread.block) {
        thread.block.forEach((block) => {
          // Determine if this is a REJECT (no match) or UNMATCH (had a match)
          const interactionType = matchEntry ? "UNMATCH" : "REJECT";

          interactionsInput.push({
            id: createId("hint"),
            type: interactionType,
            timestamp: new Date(block.timestamp),
            timestampRaw: block.timestamp,
            comment: null,
            hasComment: false,
            matchId: matchEntry ? matchId : null,
            hingeProfileId,
          });
        });
      }
    } catch (error) {
      console.error(`❌ Error processing conversation ${i}:`, error);
      console.error(`   Thread data:`, JSON.stringify(thread, null, 2));
      throw error;
    }
  });

  // Calculate statistics
  const likesCount = interactionsInput.filter(
    (i) => i.type === "LIKE_SENT",
  ).length;
  const rejectsCount = interactionsInput.filter(
    (i) => i.type === "REJECT",
  ).length;
  const unmatchesCount = interactionsInput.filter(
    (i) => i.type === "UNMATCH",
  ).length;
  const matchInteractionsCount = interactionsInput.filter(
    (i) => i.type === "MATCH",
  ).length;
  const messageSentInteractionsCount = interactionsInput.filter(
    (i) => i.type === "MESSAGE_SENT",
  ).length;
  const matchesWithMessages = matchesInput.filter(
    (m) => m.totalMessageCount > 0,
  ).length;
  const matchesWithoutMessages = matchesInput.length - matchesWithMessages;
  const totalMessages = messagesInput.length;
  const avgMessagesPerMatch =
    matchesWithMessages > 0
      ? (totalMessages / matchesWithMessages).toFixed(1)
      : "0";

  console.log(`   💬 Processing summary:`);
  console.log(`      - ${likesCount} LIKE_SENT interactions`);
  console.log(`      - ${matchInteractionsCount} MATCH interactions`);
  console.log(`      - ${matchesInput.length} match records`);
  console.log(
    `      - ${matchesWithMessages} matches with messages (avg ${avgMessagesPerMatch} msgs/match)`,
  );
  console.log(`      - ${matchesWithoutMessages} matches with no messages`);
  console.log(`      - ${messageSentInteractionsCount} MESSAGE_SENT interactions`);
  console.log(`      - ${totalMessages} message records`);
  console.log(`      - ${rejectsCount} REJECT interactions`);
  console.log(`      - ${unmatchesCount} UNMATCH interactions`);

  return {
    interactionsInput,
    matchesInput,
    messagesInput,
  };
}
