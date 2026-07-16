import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AUTH_RETURN_TO_HEADER, getSafeInternalPath } from "@/lib/auth-utils";
import { getSession } from "@/server/better-auth/server";
import { AppHeader } from "./AppHeader";
import { AnonymousUpgradeBanner } from "./dashboard/AnonymousUpgradeBanner";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session?.user) {
    const returnTo = getSafeInternalPath(
      (await headers()).get(AUTH_RETURN_TO_HEADER),
    );
    redirect(
      returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin",
    );
  }

  const isAnonymous = session.user.isAnonymous ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader session={session} />
      {isAnonymous && <AnonymousUpgradeBanner />}
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">{children}</main>
    </div>
  );
}
