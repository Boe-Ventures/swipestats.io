import { z } from "zod";

export const listThreadsInput = z.object({}).strict().optional();

export const createThreadInput = z
  .object({ title: z.string().trim().min(1).max(120).optional() })
  .strict();

export const getThreadInput = z.object({ threadId: z.string() }).strict();

export const renameThreadInput = z
  .object({
    threadId: z.string(),
    title: z.string().trim().min(1).max(120),
  })
  .strict();

export const deleteThreadInput = z.object({ threadId: z.string() }).strict();
