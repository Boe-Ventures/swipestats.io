import { z } from "zod";

export const getOrganizationBillingInput = z.object({
  organizationId: z.string().min(1),
});

export const createOrganizationCheckoutInput = z.object({
  organizationId: z.string().min(1),
});

export const getOrganizationCustomerPortalInput = z.object({
  organizationId: z.string().min(1),
});
