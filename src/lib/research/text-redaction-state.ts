import { createHash } from "node:crypto";
import { z } from "zod";
import {
  DEFAULT_PII_THRESHOLD,
  JEV_SCREENING_POLICY,
  REDACTION_SYSTEM_PROMPT,
  TEXT_REDACTION_VERSION,
  type Conversation,
} from "./text-redaction";

export const TEXT_PIPELINE = {
  version: TEXT_REDACTION_VERSION,
  jev: "jev-1.14.0",
  redactor: "gpt-6.1-terra",
  reasoning: "medium" as const,
  threshold: DEFAULT_PII_THRESHOLD,
};
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const TEXT_PIPELINE_DIGEST = digest({
  ...TEXT_PIPELINE,
  screeningPolicy: JEV_SCREENING_POLICY,
  redactionPolicy: REDACTION_SYSTEM_PROMPT,
  adapterVersion: 1,
});
export const receiptSchema = z.object({
  pipeline: z.string(),
  inputDigest: z.string(),
  outputDigest: z.string(),
  score: z.number().min(0).max(1),
  completedAt: z.string(),
});
export type TextRedactionReceipt = z.infer<typeof receiptSchema>;

export function makeReceipt(
  source: Conversation,
  sanitized: Conversation,
  score: number,
): TextRedactionReceipt {
  // No metadata, identity or message-count changes may be persisted.
  const metadata = (conversation: Conversation) => ({
    id: conversation.id,
    messages: conversation.messages.map(
      ({ content: _content, ...message }) => message,
    ),
  });
  if (digest(metadata(source)) !== digest(metadata(sanitized)))
    throw new Error("Redaction changed conversation metadata");
  return {
    pipeline: TEXT_PIPELINE_DIGEST,
    inputDigest: digest(source),
    outputDigest: digest(sanitized),
    score,
    completedAt: new Date().toISOString(),
  };
}

export function isCurrent(
  source: Conversation,
  sanitized: Conversation | null,
  receipt: unknown,
): boolean {
  const parsed = receiptSchema.safeParse(receipt);
  return Boolean(
    sanitized &&
    parsed.success &&
    parsed.data.pipeline === TEXT_PIPELINE_DIGEST &&
    parsed.data.inputDigest === digest(source) &&
    parsed.data.outputDigest === digest(sanitized),
  );
}

export const cohortSchema = z
  .array(
    z.object({
      sourceId: z.string().min(1),
      profileId: z.string().min(1),
      provider: z.enum(["TINDER", "HINGE"]),
    }),
  )
  .min(1)
  .superRefine((members, context) => {
    for (const key of ["sourceId", "profileId"] as const) {
      const ids = members.map((m) => `${m.provider}:${m[key]}`);
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          message: `Duplicate cohort ${key}`,
        });
    }
  });
export type TextCohortMember = z.infer<typeof cohortSchema>[number];

export function researchConversation(
  member: TextCohortMember,
  source: Conversation,
  sanitized: Conversation | null,
  receipt: unknown,
) {
  if (!sanitized || !isCurrent(source, sanitized, receipt))
    throw new Error(
      "Research export blocked: pending, stale or incomplete redaction",
    );
  // Explicit allowlist. Source IDs, raw text, receipt and API scores never leave.
  const publicId = (kind: string, id: string) =>
    digest([member.provider, member.profileId, kind, id]).slice(0, 32);
  return {
    type: "conversation" as const,
    profileId: member.profileId,
    provider: member.provider,
    conversationId: publicId("conversation", source.id),
    messages: sanitized.messages.map((message) => ({
      messageId: publicId("message", message.id),
      content: message.content,
      order: message.order,
      sentDate: message.sentDate,
      messageType: message.messageType,
    })),
  };
}
