import { formatDistance } from "date-fns";
import { nanoid } from "nanoid";
import type { ConversationThread } from "@/lib/interfaces/HingeDataJSON";
import type {
  MatchInsert,
  MessageInsert,
  HingeInteractionInsert,
} from "@/server/db/schema";
import { createId } from "@/server/db/utils";
import { classifyHingeThread } from "@/lib/utils/classifyHingeThread";
import {
  compareHingeTimestamps,
  parseHingeTimestampToDate,
} from "@/lib/hinge/timestamp";
import { deriveHingeMatchConversationMetrics } from "./hinge-conversation-metrics";

type NormalizedHingeMessage = {
  sourceOrder: number;
  sentDate: Date;
  sentDateRaw: string;
  content: string;
  messageType: "TEXT" | "VOICE_NOTE";
  type: "voice_note" | undefined;
  gifUrl: string | null;
};

function normalizeHingeMessages(
  thread: ConversationThread,
  conversationIndex: number,
): NormalizedHingeMessage[] {
  const chats = Array.isArray(thread.chats) ? thread.chats : [];
  const voiceNotes = Array.isArray(thread.voice_notes)
    ? thread.voice_notes
    : [];
  const voiceNoteQueues = new Map<
    string,
    Array<{ url: string; voiceOrder: number }>
  >();
  voiceNotes.forEach((note, voiceOrder) => {
    parseHingeTimestampToDate(
      note.timestamp,
      `Hinge voice-note timestamp at conversation ${conversationIndex}, voice note ${voiceOrder}`,
    );
    const queue = voiceNoteQueues.get(note.timestamp) ?? [];
    queue.push({ url: note.url, voiceOrder });
    voiceNoteQueues.set(note.timestamp, queue);
  });

  const normalized = chats.flatMap(
    (chat, sourceOrder): NormalizedHingeMessage[] => {
      const sentDate = parseHingeTimestampToDate(
        chat.timestamp,
        `Hinge message timestamp at conversation ${conversationIndex}, message ${sourceOrder}`,
      );

      const voiceNote = !chat.body
        ? voiceNoteQueues.get(chat.timestamp)?.shift()
        : undefined;
      const voiceNoteUrl = voiceNote?.url ?? null;
      if (!chat.body && !voiceNoteUrl) {
        console.log(
          `   ⚠️  Skipping message without body at conversation ${conversationIndex}, message ${sourceOrder}`,
        );
        return [];
      }

      const isVoiceNote = voiceNoteUrl !== null;
      return [
        {
          sourceOrder,
          sentDate,
          sentDateRaw: chat.timestamp,
          content: isVoiceNote ? "[Voice Note]" : chat.body,
          messageType: isVoiceNote ? "VOICE_NOTE" : "TEXT",
          type: isVoiceNote ? "voice_note" : undefined,
          gifUrl: voiceNoteUrl,
        },
      ];
    },
  );

  // REVIEW(provider assumption): Hinge can emit a voice_notes entry without a
  // mirrored blank chat row. It is still an uploader-sent message and must be
  // counted once; timestamp queues preserve duplicate occurrences.
  for (const [timestamp, queue] of voiceNoteQueues) {
    const sentDate = parseHingeTimestampToDate(
      timestamp,
      `Hinge standalone voice-note timestamp at conversation ${conversationIndex}`,
    );
    for (const note of queue) {
      normalized.push({
        sourceOrder: chats.length + note.voiceOrder,
        sentDate,
        sentDateRaw: timestamp,
        content: "[Voice Note]",
        messageType: "VOICE_NOTE",
        type: "voice_note",
        gifUrl: note.url,
      });
    }
  }

  return normalized.sort(
    (a, b) =>
      compareHingeTimestamps(a.sentDateRaw, b.sentDateRaw) ||
      a.sourceOrder - b.sourceOrder,
  );
}

function findLikeThatLedToMatch(
  likes: NonNullable<ConversationThread["like"]>,
  matchTimestamp: string,
) {
  const precedingLikes = likes.filter(
    (like) => compareHingeTimestamps(like.timestamp, matchTimestamp) <= 0,
  );

  // REVIEW(provider assumption): when one exported thread contains repeated
  // likes, the latest like before the match is treated as the match-causing
  // like. Every like is still counted; only likedAt/comment use this choice.
  // A like timestamped after the match cannot have caused that match, so it is
  // deliberately left unlinked instead of being used as a convenient fallback.
  if (precedingLikes.length === 0) return undefined;

  return precedingLikes.reduce((latest, like) =>
    compareHingeTimestamps(like.timestamp, latest.timestamp) > 0
      ? like
      : latest,
  );
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
      const likeEntries = Array.isArray(thread.like) ? thread.like : [];
      // REVIEW(provider assumption): Hinge documents one match event per
      // exported thread. If that contract changes, multiple match events need
      // distinct persisted threads rather than being folded into this one.
      const matchEntry =
        Array.isArray(thread.match) && thread.match.length > 0
          ? thread.match[0]
          : undefined;
      const hasBlock = Array.isArray(thread.block) && thread.block.length > 0;
      const classification = classifyHingeThread(thread);

      if (!matchEntry && classification.hasChats) {
        // REVIEW(provider assumption): Hinge message and voice-note events are
        // match-scoped, but incomplete exports can omit the match event. We
        // quarantine the upload instead of silently dropping messages or
        // fabricating a match timestamp that would corrupt match-rate math.
        throw new Error(
          `Hinge conversation ${i} contains messages without a match event.`,
        );
      }

      const matchId: string | null = matchEntry ? nanoid() : null;

      // 1. Process every LIKE_SENT event. A thread can contain repeat likes.
      for (const likeEntry of likeEntries) {
        // REVIEW(provider assumption): the outer entry is the like action and
        // its nested array describes the liked target/reaction. Only its first
        // comment is representable in the current interaction row.
        const likeComment = likeEntry.like?.[0]?.comment;

        interactionsInput.push({
          id: createId("hint"),
          type: "LIKE_SENT",
          threadOrigin: classification.origin,
          threadState: classification.state,
          timestamp: parseHingeTimestampToDate(
            likeEntry.timestamp,
            `Hinge like timestamp at conversation ${i}`,
          ),
          timestampRaw: likeEntry.timestamp,
          comment: likeComment ?? null,
          hasComment: !!likeComment,
          matchId,
          hingeProfileId,
        });
      }

      // 2. Process MATCH (only if mutual match occurred)
      if (matchEntry) {
        const normalizedMessages = normalizeHingeMessages(thread, i);
        const conversationMetrics = deriveHingeMatchConversationMetrics(
          normalizedMessages.map((message) => ({
            sentDate: message.sentDate,
            messageType: message.messageType,
            order: message.sourceOrder,
          })),
        );
        // REVIEW(provider assumption): storage currently has one `weMet` object
        // per match, so only the first provider response is retained. If Hinge
        // begins exporting revisions here, this needs an event-grain table.
        const weMetData = thread.we_met?.[0];
        const matchedLike =
          likeEntries.length > 0
            ? findLikeThatLedToMatch(likeEntries, matchEntry.timestamp)
            : undefined;
        const matchedLikeReaction = matchedLike?.like?.[0];

        matchesInput.push({
          id: matchId!,
          order: i,
          ...conversationMetrics,
          primaryLanguage: null,
          languages: [],
          engagementScore: null,
          tinderMatchId: null,
          tinderProfileId: null,
          hingeProfileId,
          weMet: weMetData
            ? {
                timestamp: weMetData.timestamp,
                did_meet_subject: weMetData.did_meet_subject,
                was_my_type: weMetData.was_my_type ?? null,
              }
            : null,
          like: matchedLike
            ? {
                timestamp: matchedLike.timestamp,
                comment: matchedLikeReaction?.comment ?? null,
              }
            : null,
          match: { timestamp: matchEntry.timestamp },
          likedAt: matchedLike
            ? parseHingeTimestampToDate(
                matchedLike.timestamp,
                `Hinge matched-like timestamp at conversation ${i}`,
              )
            : null,
          matchedAt: parseHingeTimestampToDate(
            matchEntry.timestamp,
            `Hinge match timestamp at conversation ${i}`,
          ),
        });

        // Create MATCH interaction
        interactionsInput.push({
          id: createId("hint"),
          type: "MATCH",
          threadOrigin: classification.origin,
          threadState: classification.state,
          timestamp: parseHingeTimestampToDate(
            matchEntry.timestamp,
            `Hinge match timestamp at conversation ${i}`,
          ),
          timestampRaw: matchEntry.timestamp,
          comment: null,
          hasComment: false,
          matchId: matchId!,
          hingeProfileId,
        });

        // 3. Process normalized outgoing messages in chronological order.
        normalizedMessages.forEach((message, messageIndex) => {
          const previousMessage = normalizedMessages[messageIndex - 1];
          const timeSinceLastMessage = previousMessage
            ? Math.floor(
                (message.sentDate.getTime() -
                  previousMessage.sentDate.getTime()) /
                  1000,
              )
            : 0;

          // GDPR data only contains YOUR messages - all are outgoing
          messagesInput.push({
            id: nanoid(),
            messageType: message.messageType,
            to: 1, // Always 1 for Hinge (sent by user)
            sentDate: message.sentDate,
            sentDateRaw: message.sentDateRaw,
            content: message.content,
            charCount: message.content.length,
            contentRaw: message.content,
            type: message.type,
            gifUrl: message.gifUrl,
            matchId: matchId!,
            tinderProfileId: null,
            hingeProfileId,
            order: message.sourceOrder,
            timeSinceLastMessage,
            timeSinceLastMessageRelative: previousMessage
              ? formatDistance(previousMessage.sentDate, message.sentDate)
              : null,
            language: null,
            emotionScore: null,
            contentSanitized: null,
          });

          // Create MESSAGE_SENT interaction
          interactionsInput.push({
            id: createId("hint"),
            type: "MESSAGE_SENT",
            threadOrigin: classification.origin,
            threadState: classification.state,
            timestamp: message.sentDate,
            timestampRaw: message.sentDateRaw,
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
          const isPostMatchBlock =
            matchEntry !== undefined &&
            compareHingeTimestamps(block.timestamp, matchEntry.timestamp) >= 0;
          // A pre-match removal cannot be an unmatch. A single exported thread
          // can contain a reject followed by a later like and match.
          // REVIEW(provider assumption): `block_type` is not currently modeled.
          // We classify the action from chronology because the durable enum only
          // distinguishes pre-match removal from post-match unmatch.
          const interactionType = isPostMatchBlock ? "UNMATCH" : "REJECT";

          interactionsInput.push({
            id: createId("hint"),
            type: interactionType,
            threadOrigin: classification.origin,
            threadState: classification.state,
            timestamp: parseHingeTimestampToDate(
              block.timestamp,
              `Hinge block timestamp at conversation ${i}`,
            ),
            timestampRaw: block.timestamp,
            comment: null,
            hasComment: false,
            matchId: isPostMatchBlock ? matchId : null,
            hingeProfileId,
          });
        });
      }
    } catch (error) {
      console.error(`❌ Error processing conversation ${i}:`, error);
      console.error(
        "   Thread payload omitted because it may contain messages",
      );
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
  console.log(
    `      - ${messageSentInteractionsCount} MESSAGE_SENT interactions`,
  );
  console.log(`      - ${totalMessages} message records`);
  console.log(`      - ${rejectsCount} REJECT interactions`);
  console.log(`      - ${unmatchesCount} UNMATCH interactions`);

  return {
    interactionsInput,
    matchesInput,
    messagesInput,
  };
}
