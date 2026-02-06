"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Database,
  Activity,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminHomePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [tinderId, setTinderId] = useState("");

  // Fetch recent profiles (same query as directory page)
  const { data, isLoading } = useQuery(
    trpc.directory.list.queryOptions({
      page: 1,
      limit: 10,
      sortBy: "newest",
    }),
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tinderId.trim()) {
      router.push(`/admin/insights/tinder/${tinderId.trim()}`);
    }
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

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Quick Profile Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter Tinder Profile ID..."
              value={tinderId}
              onChange={(e) => setTinderId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!tinderId.trim()}>
              Search Profile
            </Button>
          </form>
          <p className="mt-2 text-sm text-gray-500">
            Enter a full tinderId to view detailed profile information
          </p>
        </CardContent>
      </Card>

      {/* Recent Profiles */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Recent Profiles
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && data?.profiles && data.profiles.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {profile.gender === "MALE"
                                ? "Man"
                                : profile.gender === "FEMALE"
                                  ? "Woman"
                                  : "Person"}
                              , {profile.ageAtUpload}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {profile.platform}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {profile.city}
                            {profile.country && `, ${profile.country}`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-600">
                        <span>
                          {profile.matchesTotal?.toLocaleString() ?? 0} matches
                        </span>
                        <span>
                          {profile.swipeLikesTotal?.toLocaleString() ?? 0}{" "}
                          swipes
                        </span>
                        {profile.matchRate && (
                          <span>
                            {(profile.matchRate * 100).toFixed(1)}% match rate
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/insights/tinder/${profile.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Inspect
                      </Link>
                      <Link
                        href={`/insights/tinder/${profile.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && (!data?.profiles || data.profiles.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No profiles found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={Users}
            title="User Management"
            description="View and manage user accounts"
            href="/admin/users"
            disabled
          />
          <ActionCard
            icon={Database}
            title="Database Stats"
            description="View database metrics and health"
            href="/admin/database"
            disabled
          />
          <ActionCard
            icon={Activity}
            title="System Monitoring"
            description="Monitor system performance"
            href="/admin/monitoring"
            disabled
          />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Additional admin features coming soon
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href: _href,
  disabled = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
}) {
  return (
    <Card
      className={`transition-shadow hover:shadow-md ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <CardContent className="flex flex-col items-start gap-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        {disabled && <span className="text-xs text-gray-500">Coming soon</span>}
      </CardContent>
    </Card>
  );
}
