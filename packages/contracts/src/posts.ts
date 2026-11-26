import { z } from "zod";

export const helloInput = z.object({ text: z.string() });

export const allInput = z
  .object({ limit: z.number().int().min(1).max(100).default(50) })
  .strict()
  .optional();

export const createInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const deleteInput = z.object({ id: z.string() });

export const getLatestInput = z.object({}).strict().optional();

export const getSecretMessageInput = z.object({}).strict().optional();

export const getInput = z.object({ id: z.string().min(1) }).strict();
export const updateInput = z
  .object({ id: z.string().min(1), title: z.string().trim().min(1).max(256) })
  .strict();
