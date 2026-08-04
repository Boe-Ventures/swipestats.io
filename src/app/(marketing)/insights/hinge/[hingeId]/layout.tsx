import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { hingeProfileTable } from "@/server/db/schema";

import { HingeInsightsProvider } from "./HingeInsightsProvider";

// Prevent indexing of user insights pages (sensitive personal data)
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HingeInsightsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ hingeId: string }>;
}) {
  const { hingeId } = await params;
  const session = await getSession();

  // Only ownership is needed server-side. The client fetches a deliberately
  // narrow insights projection that excludes account, identity, and content.
  const profile = await db.query.hingeProfileTable.findFirst({
    where: eq(hingeProfileTable.hingeId, hingeId),
    columns: { userId: true },
  });

  if (!profile) notFound();

  // Determine ownership for readonly flag
  const isOwner = session?.user?.id === profile.userId;
  const isAnonymous = session?.user?.isAnonymous ?? false;

  return (
    <HingeInsightsProvider
      hingeId={hingeId}
      readonly={!isOwner}
      isOwner={isOwner}
      isAnonymous={isAnonymous}
    >
      {children}
    </HingeInsightsProvider>
  );
}
