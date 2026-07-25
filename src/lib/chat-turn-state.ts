/**
 * Waiting-state logic for streaming chat transcripts.
 *
 * The AI SDK appends the assistant message the moment the response stream
 * opens — before the model has emitted a single token — and flips `status` to
 * "streaming" at the same time. Any waiting indicator gated on "the last
 * message is still the user's" therefore disappears exactly when the wait is
 * longest, leaving an avatar and a name floating over blank space for the
 * whole time-to-first-token. The same dead air returns mid-turn: once a tool
 * card settles, nothing on screen moves while the model composes its next step.
 *
 * These helpers gate on what the transcript is actually drawing rather than on
 * transport status alone. They take structural shapes rather than the SDK's
 * `UIMessage` generics so fixtures and live `useChat` output share one rule.
 */

const SETTLED_TOOL_STATES = new Set([
  "output-available",
  "output-error",
  "output-denied",
]);

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

export interface ChatTurnPartLike {
  readonly type: string;
  /** Present on text and reasoning parts. */
  readonly text?: unknown;
  /** Present on tool parts. */
  readonly state?: unknown;
}

export interface ChatTurnMessageLike {
  readonly role: string;
  readonly parts: readonly ChatTurnPartLike[];
  /** Present on SDK messages; used as the React key when available. */
  readonly id?: string;
}

function partText(part: ChatTurnPartLike): string {
  return typeof part.text === "string" ? part.text : "";
}

function partState(part: ChatTurnPartLike): string {
  return typeof part.state === "string" ? part.state : "";
}

export function isToolPart(part: ChatTurnPartLike): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

/** A tool call that has finished — its card is static from here on. */
export function isSettledToolPart(part: ChatTurnPartLike): boolean {
  return isToolPart(part) && SETTLED_TOOL_STATES.has(partState(part));
}

/**
 * Whether a part draws anything. Tool parts render a card in every state,
 * prose renders once it is more than whitespace, and step boundaries, data
 * parts, and empty text draw nothing at all.
 */
export function partHasVisibleContent(part: ChatTurnPartLike): boolean {
  if (part.type === "text") return partText(part).trim().length > 0;
  return isToolPart(part);
}

/**
 * Whether a turn has anything to draw. Used to skip an assistant turn that is
 * still an empty shell so its avatar and name do not float above blank space
 * while the model spins up.
 */
export function turnHasVisibleContent(message: ChatTurnMessageLike): boolean {
  return message.parts.some(partHasVisibleContent);
}

export function isChatBusy(status: string): boolean {
  return status === "submitted" || status === "streaming";
}

/**
 * Whether the turn is in flight with nothing on screen visibly moving.
 *
 * False while prose streams or a tool card runs under its own label, and while
 * a tool waits on the user's approval — that wait belongs to the user, so
 * nagging about it would be wrong.
 */
function turnIsWaiting({
  status,
  messages,
}: {
  status: string;
  messages: readonly ChatTurnMessageLike[];
}): boolean {
  if (!isChatBusy(status)) return false;

  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return true;

  const tail = last.parts[last.parts.length - 1];
  if (!tail) return true;

  if (isToolPart(tail)) return isSettledToolPart(tail);
  if (tail.type === "text") return partText(tail).trim().length === 0;
  return true;
}

/**
 * Show the full pending bubble: the reply does not exist on screen yet, either
 * because the request just went out or because the stream has opened an empty
 * assistant shell. This is the long wait — it deserves an avatar and a label.
 *
 * Mutually exclusive with {@link shouldShowMidTurnShimmer}.
 */
export function shouldShowPendingTurn({
  status,
  messages,
}: {
  status: string;
  messages: readonly ChatTurnMessageLike[];
}): boolean {
  if (!turnIsWaiting({ status, messages })) return false;
  const last = messages[messages.length - 1];
  return last?.role !== "assistant" || !turnHasVisibleContent(last);
}

/**
 * Show the slim shimmer: the reply has already drawn something (usually a
 * settled tool card) and the model is composing its next step. Lighter than
 * the pending bubble because the turn is visibly under way.
 *
 * Mutually exclusive with {@link shouldShowPendingTurn}.
 */
export function shouldShowMidTurnShimmer({
  status,
  messages,
}: {
  status: string;
  messages: readonly ChatTurnMessageLike[];
}): boolean {
  if (!turnIsWaiting({ status, messages })) return false;
  const last = messages[messages.length - 1];
  return last?.role === "assistant" && turnHasVisibleContent(last);
}
