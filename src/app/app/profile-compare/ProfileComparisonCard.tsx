import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Trash2, Eye, EyeOff, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { ProviderIconChip } from "@/app/app/profile-compare/[id]/provider-icon-chip";

import type { RouterOutputs } from "@/trpc/react";

type Comparison = RouterOutputs["profileCompare"]["list"][number];

interface ProfileComparisonCardProps {
  comparison: Comparison;
  onDelete: (id: string) => void;
}

export function ProfileComparisonCard({
  comparison,
  onDelete,
}: ProfileComparisonCardProps) {
  const thumbnail = comparison.columns[0]?.content[0]?.attachment?.url;
  const columnCount = comparison.columns.length;
  const photoCount = comparison.columns.reduce(
    (sum, column) => sum + column.content.filter((c) => c.attachment?.url).length,
    0,
  );
  const href = `/app/profile-compare/${comparison.id}`;

  return (
    <Card className="relative flex flex-row gap-0 overflow-hidden border-gray-200 bg-white p-0 shadow-sm transition-shadow hover:shadow-lg">
      {/* Thumbnail — left rail */}
      <div className="bg-muted relative w-28 shrink-0 self-stretch overflow-hidden sm:w-44">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={comparison.name || "Profile comparison"}
            fill
            sizes="(min-width: 640px) 176px, 112px"
            className="object-cover"
          />
        ) : (
          <div className="from-muted to-muted/60 flex h-full w-full items-center justify-center bg-gradient-to-br">
            <Images className="text-muted-foreground/50 h-8 w-8" />
          </div>
        )}
        {/* photo count chip */}
        {photoCount > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <Images className="h-3 w-3" />
            {photoCount}
          </span>
        )}
      </div>

      {/* Body */}
      <CardContent className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={href}
              className="min-w-0 after:absolute after:inset-0 after:content-['']"
            >
              <h3 className="truncate text-base font-semibold tracking-tight">
                {comparison.name || "Untitled Comparison"}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {columnCount} {columnCount === 1 ? "app" : "apps"} •{" "}
                {formatDistanceToNow(new Date(comparison.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </Link>
            {/* Status, not an action — non-interactive badge */}
            <Badge
              variant={comparison.isPublic ? "secondary" : "outline"}
              className="text-muted-foreground shrink-0 gap-1 font-normal"
              title={
                comparison.isPublic
                  ? "Public — anyone with the link can view"
                  : "Private — only you can view"
              }
            >
              {comparison.isPublic ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              {comparison.isPublic ? "Public" : "Private"}
            </Badge>
          </div>

          {/* Provider brand chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {comparison.columns.map((column) => (
              <ProviderIconChip
                key={column.id}
                config={getProviderConfig(column.dataProvider)}
                className="h-7 w-7 rounded-lg"
              />
            ))}
          </div>
        </div>

        {/* Actions — sit above the stretched card link */}
        <div className="relative z-10 ml-auto flex items-center gap-0.5">
          {comparison.isPublic && comparison.shareKey && (
            <Link
              href={`/share/profile-compare/${comparison.shareKey}`}
              target="_blank"
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-8 w-8"
                title="Open share link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8"
            title="Delete comparison"
            onClick={() => onDelete(comparison.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
