import type {
  ConversationThread,
  HingeThreadOrigin,
  HingeThreadState,
} from "@/lib/interfaces/HingeDataJSON";

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
  const hasChats = Array.isArray(thread.chats) && thread.chats.length > 0;
  const hasBlock = Array.isArray(thread.block) && thread.block.length > 0;
  const hasWeMet = Array.isArray(thread.we_met) && thread.we_met.length > 0;

  let origin: HingeThreadOrigin = "UNKNOWN";
  if (hasLike) {
    origin = "OUTBOUND_LIKE";
  } else if (hasMatch) {
    origin = "INBOUND_LIKE";
  } else if (hasBlock) {
    origin = "UNKNOWN_REMOVE";
  }

  let state: HingeThreadState = "UNKNOWN";
  if (hasMatch && hasBlock) {
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
