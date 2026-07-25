import type {
  ChatTurnMessageLike,
  ChatTurnPartLike,
} from "@/lib/chat-turn-state";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/components/ui/lib/utils";
import {
  isSettledToolPart,
  isToolPart,
  shouldShowMidTurnShimmer,
  shouldShowPendingTurn,
  turnHasVisibleContent,
} from "@/lib/chat-turn-state";

/**
 * Golden CHAT primitives — the streaming-assistant dialect.
 *
 * Built against the AI SDK's `UIMessage` shape (`role` + `parts`) so a live
 * `useChat()` result drops straight in — verified to compile against
 * `@ai-sdk/react` v7's return type:
 *
 *   const { messages, status } = useChat({ transport });
 *   <ChatTranscript messages={messages} status={status} />
 *
 * The props stay structural rather than importing `UIMessage` directly so the
 * design-system fixtures type-check without casting.
 *
 * The waiting behaviour is the part worth getting right, and it lives in
 * `@/lib/chat-turn-state`. A streaming turn is not one wait but three — before
 * the reply exists, while a tool runs, and between steps — and a transcript
 * that only handles the first leaves the user staring at an empty pane. See
 * that module for why status alone is not enough to drive this.
 */

/* ---------------------------------------------------------------- tool card */

const TOOL_STATE_LABELS: Record<string, string> = {
  "input-streaming": "Preparing",
  "input-available": "Running",
  "approval-requested": "Needs your approval",
  "approval-responded": "Starting",
  "output-available": "Done",
  "output-error": "Failed",
  "output-denied": "Declined",
};

function toolName(part: ChatTurnPartLike): string {
  return part.type.startsWith("tool-") ? part.type.slice(5) : "tool";
}

/**
 * One tool call, in any lifecycle state. Renders in every state on purpose —
 * an in-flight tool that draws nothing is indistinguishable from a stall.
 */
export function ChatToolCard({
  part,
  className,
}: {
  part: ChatTurnPartLike;
  className?: string;
}) {
  const state = typeof part.state === "string" ? part.state : "";
  const label = TOOL_STATE_LABELS[state] ?? "Working";
  const failed = state === "output-error";
  const denied = state === "output-denied";
  const settled = isSettledToolPart(part);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px]",
        failed
          ? "border-red-200 bg-red-50 text-red-700"
          : denied
            ? "border-gray-200 bg-gray-50 text-gray-500"
            : settled
              ? "border-gray-200 bg-white text-gray-700"
              : "border-dashed border-gray-300 bg-gray-50 text-gray-600",
        className,
      )}
    >
      {!settled && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
      <span className="font-mono text-[11px] tracking-[0.04em] text-gray-500 uppercase">
        {toolName(part)}
      </span>
      <span className="ml-auto">{label}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- waiting */

/**
 * The full pending turn — avatar, name, and a labelled wait. Shown while the
 * reply does not exist on screen yet, which is the longest wait in a turn.
 */
export function ChatPendingTurn({
  title = "Thinking…",
  detail,
  assistantName = "SwipeStats",
}: {
  title?: string;
  detail?: string;
  assistantName?: string;
}) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
      <ChatAvatar name={assistantName} />
      <span className="self-center text-[12px] font-semibold text-gray-900">
        {assistantName}
      </span>
      <div className="col-span-2 w-fit max-w-full rounded-2xl rounded-tl-md bg-gray-100 px-3.5 py-2">
        <div className="flex items-center gap-2 text-[13px] text-gray-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          {title}
        </div>
        {detail && (
          <div className="mt-0.5 text-[11.5px] text-gray-500">{detail}</div>
        )}
      </div>
    </div>
  );
}

/**
 * The slim between-steps cue. Deliberately lighter than the pending turn: the
 * reply is already on screen, so this only has to say "still going".
 */
export function ChatMidTurnShimmer({
  label = "Working on the next step…",
}: {
  label?: string;
}) {
  return (
    <div className="pl-[36px]">
      <span className="inline-flex animate-pulse items-center gap-2 text-[12px] text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        {label}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- message */

function ChatAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-600 text-[11px] font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** One turn. User turns are a right-aligned bubble; assistant turns stack. */
export function ChatMessage({
  message,
  assistantName = "SwipeStats",
}: {
  message: ChatTurnMessageLike;
  assistantName?: string;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-rose-600 px-3.5 py-2 text-[13px] leading-relaxed text-white">
          {message.parts.map((part, index) =>
            part.type === "text" && typeof part.text === "string" ? (
              <span key={index} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
      <ChatAvatar name={assistantName} />
      <span className="self-center text-[12px] font-semibold text-gray-900">
        {assistantName}
      </span>
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          const text = typeof part.text === "string" ? part.text : "";
          if (!text.trim()) return null;
          return (
            <div
              key={index}
              className="col-span-2 max-w-[92%] min-w-0 justify-self-start"
            >
              <div className="prose prose-sm w-fit max-w-full rounded-2xl rounded-tl-md bg-gray-100 px-3.5 py-2 text-[13px] leading-relaxed text-gray-900">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            </div>
          );
        }
        if (isToolPart(part)) {
          return (
            <div key={index} className="col-span-2 min-w-0">
              <ChatToolCard part={part} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- transcript */

/**
 * The whole transcript, including every waiting state.
 *
 * Assistant turns with nothing to draw are skipped: the stream creates that
 * message before the model produces anything, and rendering it would float an
 * avatar and a name over blank space. The pending turn below stands in until
 * real content lands.
 */
export function ChatTranscript({
  messages,
  status,
  assistantName = "SwipeStats",
  pendingTitle,
  pendingDetail,
  className,
}: {
  messages: readonly ChatTurnMessageLike[];
  status: string;
  assistantName?: string;
  pendingTitle?: string;
  pendingDetail?: string;
  className?: string;
}) {
  const showPending = shouldShowPendingTurn({ status, messages });
  const showShimmer = shouldShowMidTurnShimmer({ status, messages });

  return (
    <div className={cn("space-y-4", className)}>
      {messages.map((message, index) => {
        if (message.role !== "user" && !turnHasVisibleContent(message)) {
          return null;
        }
        return (
          <ChatMessage
            key={message.id ?? index}
            message={message}
            assistantName={assistantName}
          />
        );
      })}
      {showPending && (
        <ChatPendingTurn
          title={pendingTitle}
          detail={pendingDetail}
          assistantName={assistantName}
        />
      )}
      {showShimmer && <ChatMidTurnShimmer />}
    </div>
  );
}
