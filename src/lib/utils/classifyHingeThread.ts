import type {
  ConversationThread,
  HingeThreadOrigin,
  HingeThreadState,
} from "@/lib/interfaces/HingeDataJSON";
import { compareHingeTimestamps } from "@/lib/hinge/timestamp";

export type HingeThreadClassification = {
  origin: HingeThreadOrigin;
  state: HingeThreadState;
  hasLike: boolean;
  hasMatch: boolean;
  hasChats: boolean;
  hasBlock: boolean;
  hasWeMet: boolean;
};

export function classifyHingeThread(
  thread: ConversationThread,
): HingeThreadClassification {
  const hasLike = Array.isArray(thread.like) && thread.like.length > 0;
  const hasMatch = Array.isArray(thread.match) && thread.match.length > 0;
  const hasChats =
    (Array.isArray(thread.chats) && thread.chats.length > 0) ||
    (Array.isArray(thread.voice_notes) && thread.voice_notes.length > 0);
  const hasBlock = Array.isArray(thread.block) && thread.block.length > 0;
  const hasWeMet = Array.isArray(thread.we_met) && thread.we_met.length > 0;
  const matchTimestamp = hasMatch ? thread.match![0]!.timestamp : null;
  const hasPreMatchLike =
    matchTimestamp !== null &&
    thread.like?.some(
      (like) => compareHingeTimestamps(like.timestamp, matchTimestamp) <= 0,
    );
  const hasPostMatchBlock =
    matchTimestamp !== null &&
    thread.block?.some(
      (block) => compareHingeTimestamps(block.timestamp, matchTimestamp) >= 0,
    );

  let origin: HingeThreadOrigin = "UNKNOWN";
  if (hasMatch && hasPreMatchLike) {
    origin = "OUTBOUND_LIKE";
  } else if (hasMatch && !hasLike) {
    origin = "INBOUND_LIKE";
  } else if (!hasMatch && hasLike) {
    origin = "OUTBOUND_LIKE";
  } else if (!hasMatch && hasBlock) {
    origin = "UNKNOWN_REMOVE";
  }

  let state: HingeThreadState = "UNKNOWN";
  if (hasMatch && hasPostMatchBlock) {
    state = "UNMATCHED";
  } else if (hasMatch && hasChats) {
    state = "MESSAGED";
  } else if (hasMatch) {
    state = "MATCHED";
  } else if (hasBlock) {
    state = "REMOVED";
  } else if (hasLike) {
    state = "PENDING";
  }

  return {
    origin,
    state,
    hasLike,
    hasMatch,
    hasChats,
    hasBlock,
    hasWeMet,
  };
}
