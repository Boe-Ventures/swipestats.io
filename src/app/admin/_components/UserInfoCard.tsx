"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface UserInfoCardProps {
  user: {
    id: string;
    email: string | null;
    username: string | null;
    isAnonymous: boolean | null;
    swipestatsTier: string | null;
    createdAt: Date;
  } | null;
  tinderId: string;
}

export function UserInfoCard({ user, tinderId }: UserInfoCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No user linked to this profile
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User ID */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            User ID
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">
              {user.id}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(user.id, "userId")}
            >
              {copiedField === "userId" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Email
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">
              {user.email || "No email"}
            </code>
            {user.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(user.email!, "email")}
              >
                {copiedField === "email" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Username
          </label>
          <div className="rounded bg-gray-100 px-3 py-2 text-sm">
            {user.username || "No username"}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {user.isAnonymous && (
            <Badge variant="secondary">Anonymous User</Badge>
          )}
          {user.swipestatsTier && (
            <Badge
              variant={user.swipestatsTier === "FREE" ? "outline" : "default"}
            >
              {user.swipestatsTier}
            </Badge>
          )}
        </div>

        {/* Account Created */}
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Account Created
          </label>
          <div className="text-sm">
            {format(user.createdAt, "MMM d, yyyy HH:mm")}
          </div>
        </div>

        {/* Link to Public Page */}
        <div className="border-t pt-4">
          <Link
            href={`/insights/tinder/${tinderId}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            View Public Insights Page
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
