"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Loader2,
  FileJson,
  Filter,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RecentProfiles() {
  const trpc = useTRPC();
  const [platform, setPlatform] = useState<"tinder" | "hinge" | null>(null);

  // Fetch recent profiles (same query as directory page)
  const { data, isLoading } = useQuery(
    trpc.directory.list.queryOptions({
      page: 1,
      limit: 10,
      sortBy: "newest",
      platform: platform,
    }),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Recent Profiles
        </h2>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={platform ?? "all"}
            onValueChange={(v) => {
              setPlatform(v === "all" ? null : (v as "tinder" | "hinge"));
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tinder">Tinder</SelectItem>
              <SelectItem value="hinge">Hinge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && data?.profiles && data.profiles.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.profiles.map((profile) => {
                const blobUrlRaw = profile.blobUrl as
                  | string
                  | null
                  | undefined;
                const blobUrlString =
                  typeof blobUrlRaw === "string" && blobUrlRaw
                    ? blobUrlRaw
                    : null;
                return (
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
                          {profile.matchesTotal?.toLocaleString() ?? 0}{" "}
                          matches
                        </span>
                        <span>
                          {profile.swipeLikesTotal?.toLocaleString() ?? 0}{" "}
                          swipes
                        </span>
                        {profile.matchRate && (
                          <span>
                            {(profile.matchRate * 100).toFixed(1)}% match
                            rate
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {profile.platform === "tinder" ? (
                        <>
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
                        </>
                      ) : (
                        <Link
                          href={`/insights/hinge/${profile.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {blobUrlString && (
                        <a
                          href={blobUrlString}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          title="View original blob data"
                        >
                          <FileJson className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
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
  );
}
