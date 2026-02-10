import { getSession } from "@/server/better-auth/server";
import { env } from "@/env";

export async function checkAdminAuth() {
  const isProduction = env.NEXT_PUBLIC_IS_PRODUCTION;

  // Dev/preview: skip auth
  if (!isProduction) {
    return { isAuthorized: true, session: await getSession() };
  }

  // Production: require admin email
  const session = await getSession();
  if (!session?.user) {
    return { isAuthorized: false, session: null };
  }

  const adminEmails = [
    "kristian.e.boe@gmail.com",
    "paw@swipestats.io",
    "kris@swipestats.io",
  ];
  const isAdmin = adminEmails.includes(session.user.email?.toLowerCase() ?? "");

  return { isAuthorized: isAdmin, session };
}
