import { z } from "zod";

export const getOrgInviteInput = z.object({ invitationId: z.string() });

export const acceptInvitationInput = z.object({ invitationId: z.string() });

export const listInput = z.object({}).strict().optional();

export const createInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});

export const getBySlugInput = z.object({ slug: z.string() });

export const updateInput = z.object({
  organizationId: z.string(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  logo: z.string().nullable().optional(),
});

export const deleteInput = z.object({ organizationId: z.string().min(1) });

export const inviteMemberInput = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
  organizationId: z.string(),
});

export const listInvitationsInput = z.object({
  organizationId: z.string().min(1),
});

export const cancelInvitationInput = z.object({ invitationId: z.string() });

export const removeMemberInput = z.object({ memberId: z.string() });

export const getInput = z
  .object({ organizationId: z.string().min(1) })
  .strict();
