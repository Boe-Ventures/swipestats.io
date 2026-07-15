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

  // Explicit presentation projection: never serialize birth date, owner ID,
  // raw/internal fields, or other ownership material into a public RSC payload.
  const profileRow = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    columns: {
      userId: true,
      tinderId: true,
      computed: true,
      ageAtUpload: true,
      ageAtLastUsage: true,
      createDate: true,
      createDateSource: true,
      activeTime: true,
      gender: true,
      genderStr: true,
      bio: true,
      city: true,
      country: true,
      region: true,
      userInterests: true,
      interests: true,
      instagramConnected: true,
      spotifyConnected: true,
      jobTitle: true,
      jobTitleDisplayed: true,
      company: true,
      companyDisplayed: true,
      school: true,
      schoolDisplayed: true,
      college: true,
      jobsRaw: true,
      schoolsRaw: true,
      educationLevel: true,
      ageFilterMin: true,
      ageFilterMax: true,
      interestedIn: true,
      interestedInStr: true,
      genderFilter: true,
      genderFilterStr: true,
      firstDayOnApp: true,
      lastDayOnApp: true,
      daysInProfilePeriod: true,
    },
    with: { profileMeta: true },
  });

  if (!profileRow) notFound();

  // Determine ownership for readonly flag
  const isOwner = session?.user?.id === profileRow.userId;
  const isAnonymous = session?.user?.isAnonymous ?? false;
  const { userId: _ownerId, ...profile } = profileRow;
  if (!isOwner) {
    // Public viewers need only the account month shown in the profile card.
    // Do not expose the exact account-creation timestamp used in ID derivation.
    profile.createDate = new Date(
      Date.UTC(
        profile.createDate.getUTCFullYear(),
        profile.createDate.getUTCMonth(),
        1,
      ),
    );
  }

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
