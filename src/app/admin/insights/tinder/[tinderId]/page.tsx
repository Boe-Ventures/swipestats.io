import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { tinderProfileTable } from "@/server/db/schema";
import { ProfileStatsCard } from "@/app/admin/_components/ProfileStatsCard";
import { UserInfoCard } from "@/app/admin/_components/UserInfoCard";
import { MediaGalleryCard } from "@/app/admin/_components/MediaGalleryCard";
import { Button } from "@/components/ui/button";

export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ tinderId: string }>;
}) {
  const { tinderId } = await params;

  // Fetch profile with all related data using direct Drizzle query
  const profile = await db.query.tinderProfileTable.findFirst({
    where: eq(tinderProfileTable.tinderId, tinderId),
    with: {
      profileMeta: true,
      user: {
        columns: {
          id: true,
          email: true,
          username: true,
          isAnonymous: true,
          swipestatsTier: true,
          createdAt: true,
        },
      },
      media: {
        limit: 50, // Show more than the public page (6)
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const meta = profile.profileMeta?.[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Inspector</h1>
        <p className="mt-1 text-sm text-gray-600">
          Detailed view of Tinder profile and user data
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ProfileStatsCard profile={profile} meta={meta} />
          <UserInfoCard user={profile.user} tinderId={tinderId} />
        </div>

        {/* Right Column */}
        <div>
          <MediaGalleryCard media={profile.media} />
        </div>
      </div>
    </div>
  );
}
