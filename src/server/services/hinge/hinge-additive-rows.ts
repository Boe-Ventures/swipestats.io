import type {
  HingeInteractionInsert,
  MatchInsert,
  MessageInsert,
} from "@/server/db/schema";
import type {
  HingeThreadOrigin,
  HingeThreadState,
} from "@/lib/interfaces/HingeDataJSON";
import { formatDistance } from "date-fns";
import { compareHingeTimestamps } from "@/lib/hinge/timestamp";
import { deriveHingeMatchConversationMetrics } from "./hinge-conversation-metrics";

export type ExistingMatchRow = Pick<
  MatchInsert,
  "id" | "like" | "likedAt" | "match" | "matchedAt" | "weMet"
>;
export type ExistingMatchByMatchedAt = Map<string | number, ExistingMatchRow[]>;
export type ExistingMessageRow = Pick<
  MessageInsert,
  "id" | "matchId" | "sentDate" | "messageType" | "contentRaw" | "order"
> &
  Partial<
    Pick<
      MessageInsert,
      "sentDateRaw" | "timeSinceLastMessage" | "timeSinceLastMessageRelative"
    >
  >;
export type ExistingInteractionRow = Pick<
  HingeInteractionInsert,
  "id" | "type" | "timestamp" | "matchId" | "comment"
> &
  Partial<
    Pick<
      HingeInteractionInsert,
      "timestampRaw" | "threadOrigin" | "threadState"
    >
  >;
export type MatchBackfill = { id: string; row: MatchInsert };
export type MessageBackfill = { id: string; row: MessageInsert };
export type MessageSequenceUpdate = {
  id: string;
  metrics: Pick<
    MessageInsert,
    "order" | "timeSinceLastMessage" | "timeSinceLastMessageRelative"
  >;
};
export type InteractionBackfill = {
  id: string;
  row: HingeInteractionInsert;
};
export type MatchEvidenceConflict = {
  matchId: string;
  field: "like" | "weMet";
};

export function appendHingeCrossAccountMatchOrders<T extends { order: number }>(
  retainedOrders: number[],
  incomingMatches: T[],
): T[] {
  let nextOrder =
    retainedOrders.reduce((highest, order) => Math.max(highest, order), -1) + 1;

  // REVIEW(provider assumption): each Hinge account export starts its match
  // sequence at zero, but cross-account history is required to be chronological.
  // Append the newer account after retained history so display positions remain
  // unique without pretending Hinge supplied a cross-account global order.
  return incomingMatches.map((match) => ({
    ...match,
    order: nextOrder++,
  }));
}

function getMessageKey(
  message: Pick<
    MessageInsert,
    "matchId" | "sentDate" | "messageType" | "contentRaw"
  > &
    Partial<Pick<MessageInsert, "sentDateRaw">>,
): string {
  // Hinge provides no stable message ID. Treat the export as a multiset keyed
  // by intrinsic message facts; source `order` can shift when older rows appear
  // in a later export and therefore must not participate in identity.
  return JSON.stringify([
    message.matchId,
    message.sentDateRaw ?? message.sentDate.toISOString(),
    message.messageType,
    message.contentRaw,
  ]);
}

export function getHingeMatchTimestampIdentity(
  match: Pick<MatchInsert, "match" | "matchedAt">,
): string | null {
  if (
    typeof match.match === "object" &&
    match.match !== null &&
    "timestamp" in match.match &&
    typeof (match.match as { timestamp?: unknown }).timestamp === "string"
  ) {
    return `raw:${(match.match as { timestamp: string }).timestamp}`;
  }
  return match.matchedAt ? `ms:${match.matchedAt.getTime()}` : null;
}

function getInteractionKey(
  interaction: Pick<
    HingeInteractionInsert,
    "type" | "timestamp" | "matchId" | "comment"
  > &
    Partial<Pick<HingeInteractionInsert, "timestampRaw">>,
): string {
  // Match IDs have already been remapped to their stable persisted IDs. Keep
  // thread-scoped events separate even if provider timestamps collide; retain
  // LIKE comment differences because they are distinct source observations.
  return JSON.stringify([
    interaction.type,
    interaction.timestampRaw ?? interaction.timestamp.toISOString(),
    interaction.matchId ?? null,
    interaction.comment ?? null,
  ]);
}

function cloneQueues<K, T>(queues: Map<K, T[]>): Map<K, T[]> {
  return new Map(Array.from(queues, ([key, values]) => [key, [...values]]));
}

function groupInteractionsByKey(
  interactions: ExistingInteractionRow[],
): Map<string, ExistingInteractionRow[]> {
  const interactionsByKey = new Map<string, ExistingInteractionRow[]>();
  for (const interaction of interactions) {
    const key = getInteractionKey(interaction);
    const rows = interactionsByKey.get(key) ?? [];
    rows.push(interaction);
    interactionsByKey.set(key, rows);
  }
  return interactionsByKey;
}

function getUnlinkedLikeKey(
  interaction: Pick<HingeInteractionInsert, "type" | "timestamp" | "comment"> &
    Partial<Pick<HingeInteractionInsert, "timestampRaw">>,
): string | null {
  return interaction.type === "LIKE_SENT"
    ? JSON.stringify([
        interaction.timestampRaw ?? interaction.timestamp.toISOString(),
        interaction.comment ?? null,
      ])
    : null;
}

function groupUnlinkedLikesByKey(
  interactions: ExistingInteractionRow[],
): Map<string, ExistingInteractionRow[]> {
  const interactionsByKey = new Map<string, ExistingInteractionRow[]>();
  for (const interaction of interactions) {
    if (interaction.matchId !== null) continue;
    const key = getUnlinkedLikeKey(interaction);
    if (!key) continue;
    const rows = interactionsByKey.get(key) ?? [];
    rows.push(interaction);
    interactionsByKey.set(key, rows);
  }
  return interactionsByKey;
}

function shiftUnconsumed<T extends { id: string }>(
  queue: T[] | undefined,
  consumedIds: Set<string>,
): T | undefined {
  let candidate = queue?.shift();
  while (candidate && consumedIds.has(candidate.id)) {
    candidate = queue?.shift();
  }
  if (candidate) consumedIds.add(candidate.id);
  return candidate;
}

/**
 * OUTBOUND_LIKE is backed by an observed sent-like, while INBOUND_LIKE is
 * inferred from its absence. Positive outbound evidence therefore upgrades an
 * earlier inference; other conflicting informative values retain the first
 * observation instead of oscillating across narrower exports.
 */
export function mergeHingeThreadOriginEvidence(
  existing: HingeThreadOrigin | null | undefined,
  incoming: HingeThreadOrigin | null | undefined,
): HingeThreadOrigin | null {
  if (existing === "OUTBOUND_LIKE" || incoming === "OUTBOUND_LIKE") {
    return "OUTBOUND_LIKE";
  }
  if (existing && existing !== "UNKNOWN") return existing;
  return incoming ?? existing ?? null;
}

const HINGE_THREAD_STATE_PROGRESS: Record<HingeThreadState, number> = {
  UNKNOWN: 0,
  PENDING: 1,
  MATCHED: 2,
  MESSAGED: 3,
  REMOVED: 4,
  UNMATCHED: 4,
};

/** Keep the furthest observed lifecycle state; terminal-state ties stay first. */
export function mergeHingeThreadStateEvidence(
  existing: HingeThreadState | null | undefined,
  incoming: HingeThreadState | null | undefined,
): HingeThreadState | null {
  if (!existing) return incoming ?? null;
  if (!incoming) return existing;
  return HINGE_THREAD_STATE_PROGRESS[incoming] >
    HINGE_THREAD_STATE_PROGRESS[existing]
    ? incoming
    : existing;
}

function groupMessageIdsByKey(
  messages: ExistingMessageRow[],
): Map<string, string[]> {
  const idsByKey = new Map<string, string[]>();
  for (const message of messages) {
    const key = getMessageKey(message);
    const ids = idsByKey.get(key) ?? [];
    ids.push(message.id);
    idsByKey.set(key, ids);
  }
  return idsByKey;
}

export function prepareHingeAdditiveRows(
  existingMatchesByMatchedAt: ExistingMatchByMatchedAt,
  existingMessages: ExistingMessageRow[],
  existingInteractions: ExistingInteractionRow[],
  newMatches: MatchInsert[],
  newMessages: MessageInsert[],
  newInteractions: HingeInteractionInsert[],
): {
  matchesToInsert: MatchInsert[];
  messagesToInsert: MessageInsert[];
  interactionsToInsert: HingeInteractionInsert[];
  matchBackfills: MatchBackfill[];
  messageBackfills: MessageBackfill[];
  interactionBackfills: InteractionBackfill[];
  messageSequenceUpdates: MessageSequenceUpdate[];
  matchEvidenceConflicts: MatchEvidenceConflict[];
} {
  const matchesToInsert: MatchInsert[] = [];
  const generatedToDbMatchId = new Map<string, string>();
  const matchBackfills: MatchBackfill[] = [];
  const matchEvidenceConflicts: MatchEvidenceConflict[] = [];
  const matchIdQueues = cloneQueues(existingMatchesByMatchedAt);

  for (const match of newMatches) {
    // REVIEW(provider assumption): Hinge exports no stable thread ID. Matches
    // sharing an exact raw timestamp are paired by persisted/export order; if
    // Hinge reorders exact collisions, identity is ambiguous, but multiplicity
    // and aggregate totals remain safe. Raw precision prevents distinct
    // microsecond events from collapsing into one JavaScript millisecond.
    const matchTimestampIdentity = getHingeMatchTimestampIdentity(match);
    const existingMatch =
      (matchTimestampIdentity
        ? matchIdQueues.get(matchTimestampIdentity)?.shift()
        : undefined) ??
      (match.matchedAt
        ? matchIdQueues.get(match.matchedAt.getTime())?.shift()
        : undefined);

    if (existingMatch) {
      const existingHasLike =
        existingMatch.like != null || existingMatch.likedAt != null;
      if (
        existingHasLike &&
        (match.like != null || match.likedAt != null) &&
        JSON.stringify([existingMatch.like, existingMatch.likedAt]) !==
          JSON.stringify([match.like, match.likedAt])
      ) {
        matchEvidenceConflicts.push({
          matchId: existingMatch.id,
          field: "like",
        });
      }
      if (
        existingMatch.weMet != null &&
        match.weMet != null &&
        JSON.stringify(existingMatch.weMet) !== JSON.stringify(match.weMet)
      ) {
        matchEvidenceConflicts.push({
          matchId: existingMatch.id,
          field: "weMet",
        });
      }

      // REVIEW(provider assumption): later Hinge exports may be narrower than
      // earlier ones. Optional historical evidence is monotonic: an omitted
      // value never erases a stored one, and conflicting non-null observations
      // preserve the first value while emitting a structured anomaly.
      const mergedMatch = {
        ...match,
        like: existingHasLike ? existingMatch.like : match.like,
        likedAt: existingHasLike ? existingMatch.likedAt : match.likedAt,
        weMet: existingMatch.weMet ?? match.weMet,
      };
      generatedToDbMatchId.set(match.id, existingMatch.id);
      matchBackfills.push({ id: existingMatch.id, row: mergedMatch });
      continue;
    }

    matchesToInsert.push(match);
  }

  const remapMatchId = (matchId: string | null | undefined) =>
    matchId ? (generatedToDbMatchId.get(matchId) ?? matchId) : matchId;

  const remappedMessagesInput = newMessages.map((message) => ({
    ...message,
    matchId: remapMatchId(message.matchId)!,
  }));
  const existingMessageIdQueues = groupMessageIdsByKey(existingMessages);
  const messagesToInsert: MessageInsert[] = [];
  const messageBackfills: MessageBackfill[] = [];
  for (const message of remappedMessagesInput) {
    const existingMessageId = existingMessageIdQueues
      .get(getMessageKey(message))
      ?.shift();
    if (existingMessageId) {
      messageBackfills.push({ id: existingMessageId, row: message });
    } else {
      messagesToInsert.push(message);
    }
  }

  const affectedExistingMatchIds = new Set(
    matchBackfills.map((backfill) => backfill.id),
  );
  const persistedMessageMatchIds = new Set(
    existingMessages.map((message) => message.matchId),
  );
  for (const message of remappedMessagesInput) {
    if (persistedMessageMatchIds.has(message.matchId)) {
      affectedExistingMatchIds.add(message.matchId);
    }
  }

  const messageBackfillsById = new Map(
    messageBackfills.map((backfill) => [backfill.id, backfill]),
  );
  const insertedMessageIds = new Set(
    messagesToInsert.map((message) => message.id),
  );
  const messagesById = new Map<string, ExistingMessageRow | MessageInsert>();
  const finalMessagesByMatch = new Map<
    string,
    Array<ExistingMessageRow | MessageInsert>
  >();
  for (const message of existingMessages) {
    if (!affectedExistingMatchIds.has(message.matchId)) continue;
    messagesById.set(message.id, message);
    const messages = finalMessagesByMatch.get(message.matchId) ?? [];
    messages.push(message);
    finalMessagesByMatch.set(message.matchId, messages);
  }
  for (const message of messagesToInsert) {
    if (!affectedExistingMatchIds.has(message.matchId)) continue;
    messagesById.set(message.id, message);
    const messages = finalMessagesByMatch.get(message.matchId) ?? [];
    messages.push(message);
    finalMessagesByMatch.set(message.matchId, messages);
  }

  const messageSequenceUpdates: MessageSequenceUpdate[] = [];
  for (const messages of finalMessagesByMatch.values()) {
    messages.sort((left, right) => {
      const chronology =
        left.sentDateRaw && right.sentDateRaw
          ? compareHingeTimestamps(left.sentDateRaw, right.sentDateRaw)
          : left.sentDate.getTime() - right.sentDate.getTime();
      return chronology || left.id.localeCompare(right.id);
    });
    for (const [order, message] of messages.entries()) {
      const previous = messages[order - 1];
      const metrics = {
        order,
        timeSinceLastMessage: previous
          ? Math.floor(
              (message.sentDate.getTime() - previous.sentDate.getTime()) / 1000,
            )
          : 0,
        timeSinceLastMessageRelative: previous
          ? formatDistance(previous.sentDate, message.sentDate)
          : null,
      };

      if (insertedMessageIds.has(message.id)) {
        Object.assign(message, metrics);
        continue;
      }

      const backfill = messageBackfillsById.get(message.id);
      if (backfill) {
        backfill.row = { ...backfill.row, ...metrics };
        continue;
      }

      const existing = messagesById.get(message.id) as ExistingMessageRow;
      if (
        existing.order !== metrics.order ||
        existing.timeSinceLastMessage !== metrics.timeSinceLastMessage ||
        existing.timeSinceLastMessageRelative !==
          metrics.timeSinceLastMessageRelative
      ) {
        messageSequenceUpdates.push({ id: existing.id, metrics });
      }
    }
  }

  const remappedInteractionsInput = newInteractions.map((interaction) => ({
    ...interaction,
    matchId: remapMatchId(interaction.matchId) ?? null,
  }));
  const existingInteractionQueues =
    groupInteractionsByKey(existingInteractions);
  const existingUnlinkedLikeQueues =
    groupUnlinkedLikesByKey(existingInteractions);
  const consumedInteractionIds = new Set<string>();
  const interactionsToInsert: HingeInteractionInsert[] = [];
  const interactionBackfills: InteractionBackfill[] = [];
  for (const interaction of remappedInteractionsInput) {
    let existingInteraction = shiftUnconsumed(
      existingInteractionQueues.get(getInteractionKey(interaction)),
      consumedInteractionIds,
    );
    if (
      !existingInteraction &&
      interaction.type === "LIKE_SENT" &&
      interaction.matchId !== null
    ) {
      const unlinkedKey = getUnlinkedLikeKey(interaction);
      existingInteraction = unlinkedKey
        ? shiftUnconsumed(
            existingUnlinkedLikeQueues.get(unlinkedKey),
            consumedInteractionIds,
          )
        : undefined;
    }
    if (existingInteraction) {
      interactionBackfills.push({
        id: existingInteraction.id,
        row: {
          ...interaction,
          threadOrigin: mergeHingeThreadOriginEvidence(
            existingInteraction.threadOrigin,
            interaction.threadOrigin,
          ),
          threadState: mergeHingeThreadStateEvidence(
            existingInteraction.threadState,
            interaction.threadState,
          ),
        },
      });
    } else {
      interactionsToInsert.push(interaction);
    }
  }

  const completeMessagesByMatch = new Map<
    string,
    Array<Pick<MessageInsert, "id" | "sentDate" | "messageType" | "order">>
  >();
  for (const message of existingMessages) {
    const messages = completeMessagesByMatch.get(message.matchId) ?? [];
    messages.push(message);
    completeMessagesByMatch.set(message.matchId, messages);
  }
  for (const message of messagesToInsert) {
    const messages = completeMessagesByMatch.get(message.matchId) ?? [];
    messages.push(message);
    completeMessagesByMatch.set(message.matchId, messages);
  }

  // A newer export may contain only a narrower chat history. Match derivatives
  // must describe the union we actually retain, not only the incoming slice.
  for (const backfill of matchBackfills) {
    backfill.row = {
      ...backfill.row,
      ...deriveHingeMatchConversationMetrics(
        completeMessagesByMatch.get(backfill.id) ?? [],
      ),
    };
  }

  return {
    matchesToInsert,
    messagesToInsert,
    interactionsToInsert,
    matchBackfills,
    messageBackfills,
    messageSequenceUpdates,
    interactionBackfills,
    matchEvidenceConflicts,
  };
}
