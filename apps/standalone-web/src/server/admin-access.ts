const ADMIN_EMAILS = new Set([
  "kristian.e.boe@gmail.com",
  "paw@swipestats.io",
  "kris@swipestats.io",
]);

type AdminIdentity =
  | {
      email?: string | null;
      emailVerified?: boolean | null;
    }
  | null
  | undefined;

export type AdminAccessDecision =
  | { isAuthorized: true; reason: "admin" }
  | {
      isAuthorized: false;
      reason: "unauthenticated" | "email-unverified" | "not-admin";
    };

/**
 * Pure admin-access policy shared by page and API authorization.
 *
 * Admin identity is verified the same way in local development, Preview, and
 * production. This avoids treating a process-mode flag as authentication.
 */
export function evaluateAdminAccess(input: {
  identity: AdminIdentity;
}): AdminAccessDecision {
  if (!input.identity) {
    return { isAuthorized: false, reason: "unauthenticated" };
  }

  // A matching address is not an admin credential until Better Auth has
  // verified control of it.
  if (input.identity.emailVerified !== true) {
    return { isAuthorized: false, reason: "email-unverified" };
  }

  const email = input.identity.email?.trim().toLowerCase() ?? "";
  if (ADMIN_EMAILS.has(email)) {
    return { isAuthorized: true, reason: "admin" };
  }

  return { isAuthorized: false, reason: "not-admin" };
}
