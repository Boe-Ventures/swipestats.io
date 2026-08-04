import "server-only";

import { getSession } from "@/server/better-auth/server";
import { evaluateAdminAccess } from "@/server/admin-access";

export async function checkAdminAuth() {
  const session = await getSession();
  const decision = evaluateAdminAccess({
    identity: session?.user,
  });

  return { isAuthorized: decision.isAuthorized, session };
}
