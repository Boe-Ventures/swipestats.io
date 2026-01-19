import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { tinderProfileTable } from "@/server/db/schema";

import { TinderProfileProvider } from "./TinderProfileProvider";

// Prevent indexing of user insights pages (sensitive personal data)
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TinderInsightsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tinderId: string }>;
}) {
  const { tinderId } = await params;
  const session = await getSession();

  // Light query - profile + meta only, no usage
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: { profileMeta: true },
  });

  if (!profile) notFound();

  // Determine ownership for readonly flag
  const isOwner = session?.user?.id === profile.userId;
  const isAnonymous = session?.user?.isAnonymous ?? false;

  return (
    <TinderProfileProvider
      initialProfile={profile}
      tinderId={tinderId}
      readonly={!isOwner}
      isOwner={isOwner}
      isAnonymous={isAnonymous}
    >
      {children}
    </TinderProfileProvider>
  );
}
