import { count } from "drizzle-orm";
import { db } from "@/server/db";
import {
  userTable,
  tinderProfileTable,
  hingeProfileTable,
  mediaTable,
  matchTable,
  messageTable,
} from "@/server/db/schema";
import { GlobalStats } from "./_components/GlobalStats";
import { QuickSearch } from "./_components/QuickSearch";
import { RecentProfiles } from "./_components/RecentProfiles";
import { QuickActions } from "./_components/QuickActions";

export default async function AdminHomePage() {
  // Fetch global stats in parallel using direct Drizzle queries
  const [
    usersResult,
    tinderProfilesResult,
    hingeProfilesResult,
    mediaResult,
    matchesResult,
    messagesResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(userTable),
    db.select({ count: count() }).from(tinderProfileTable),
    db.select({ count: count() }).from(hingeProfileTable),
    db.select({ count: count() }).from(mediaTable),
    db.select({ count: count() }).from(matchTable),
    db.select({ count: count() }).from(messageTable),
  ]);

  const stats = {
    totalUsers: usersResult[0]?.count ?? 0,
    totalTinderProfiles: tinderProfilesResult[0]?.count ?? 0,
    totalHingeProfiles: hingeProfilesResult[0]?.count ?? 0,
    totalMedia: mediaResult[0]?.count ?? 0,
    totalMatches: matchesResult[0]?.count ?? 0,
    totalMessages: messagesResult[0]?.count ?? 0,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Inspect profiles, manage users, and monitor system health
        </p>
      </div>

      {/* Global Stats */}
      <GlobalStats stats={stats} />

      {/* Quick Search - Client Component */}
      <QuickSearch />

      {/* Recent Profiles - Client Component */}
      <RecentProfiles />

      {/* Quick Actions - Static Component */}
      <QuickActions />
    </div>
  );
}
