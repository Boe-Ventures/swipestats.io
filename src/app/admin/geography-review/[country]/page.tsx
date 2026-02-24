"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Map,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Platform = "all" | "tinder" | "hinge";
type GroupBy = "region" | "city";
type SortBy = "count" | "name";

export default function CountryGeographyPage() {
  const params = useParams();
  const country = decodeURIComponent(params.country as string);
  const trpc = useTRPC();

  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState<Platform>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("region");
  const [sortBy, setSortBy] = useState<SortBy>("count");

  const { data, isLoading } = useQuery(
    trpc.admin.listProfilesByRegion.queryOptions({
      country,
      page,
      limit: 20,
      platform,
      groupBy,
      sortBy,
    }),
  );

  // Get icon based on groupBy
  const Icon = groupBy === "region" ? Map : MapPin;

  // Reset to page 1 when filters change
  const handlePlatformChange = (value: Platform) => {
    setPlatform(value);
    setPage(1);
  };

  const handleGroupByChange = (value: GroupBy) => {
    setGroupBy(value);
    setPage(1);
  };

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/geography-review">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Geography
              </Button>
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{country}</h1>
          <p className="mt-2 text-gray-600">
            Profile distribution by {groupBy === "region" ? "state/region" : "city"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Platform
              </label>
              <Select value={platform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="tinder">Tinder</SelectItem>
                  <SelectItem value="hinge">Hinge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Group By
              </label>
              <Select value={groupBy} onValueChange={handleGroupByChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">State/Region</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={handleSortByChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Profile Count</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Table */}
      {!isLoading && data && data.locations.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>
                    {groupBy === "region" ? "State/Region" : "City"}
                  </TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {platform === "all" && (
                    <>
                      <TableHead className="text-right">Tinder</TableHead>
                      <TableHead className="text-right">Hinge</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Male</TableHead>
                  <TableHead className="text-right">Female</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.locations.map((location, index) => {
                  const rank = (page - 1) * 20 + index + 1;
                  return (
                    <TableRow key={location.location}>
                      <TableCell className="font-medium text-gray-500">
                        {rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {location.location}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {location.totalCount.toLocaleString()}
                      </TableCell>
                      {platform === "all" && (
                        <>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {location.tinderCount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {location.hingeCount.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right text-gray-600">
                        {location.maleCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {location.femaleCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {location.otherCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/directory?country=${encodeURIComponent(country)}&${groupBy}=${encodeURIComponent(location.location)}`}
                          target="_blank"
                        >
                          <Button variant="ghost" size="sm" className="h-8">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && data && data.locations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No {groupBy === "region" ? "states/regions" : "cities"} found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your filters to see results
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * 20 + 1).toLocaleString()} -{" "}
            {Math.min(page * 20, data.totalCount).toLocaleString()} of{" "}
            {data.totalCount.toLocaleString()}{" "}
            {groupBy === "region" ? "states/regions" : "cities"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-4">
              <span className="text-sm text-gray-600">
                Page {page} of {data.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
