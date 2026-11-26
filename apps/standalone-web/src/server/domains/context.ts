import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { readConsent } from "@/lib/analytics/consent";

export async function createDomainContext(options: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: options.headers });
  return {
    db,
    session,
    headers: options.headers,
    analyticsConsent: readConsent(session?.user?.analyticsConsent),
  };
}
type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type DomainContext = {
  db: typeof db;
  headers: Headers;
  analyticsConsent: ReturnType<typeof readConsent>;
  session: null | {
    user: Session["user"];
    session: Pick<Session["session"], "id">;
  };
};
