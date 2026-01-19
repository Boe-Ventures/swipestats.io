import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSession } from "@/server/better-auth/server";
import { AppHeader } from "./AppHeader";
import { AnonymousUpgradeBanner } from "./dashboard/AnonymousUpgradeBanner";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/signin");
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
