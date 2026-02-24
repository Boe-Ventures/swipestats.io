"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickSearch() {
  const router = useRouter();
  const [tinderId, setTinderId] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tinderId.trim()) {
      router.push(`/admin/insights/tinder/${tinderId.trim()}`);
    }
  };

  return (
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
  );
}
