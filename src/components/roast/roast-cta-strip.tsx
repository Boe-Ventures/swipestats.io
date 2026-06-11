"use client";

import { ChevronRight, Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/lib/utils";

interface RoastCtaStripProps {
  title: string;
  description?: string;
  /** Small pill next to the title — e.g. the roast tagline or tone. */
  badge?: string | null;
  /** Optional word next to the chevron. The whole card is clickable and the
   * chevron alone signals that — only add a label when the action needs naming. */
  actionLabel?: string;
  onClick: () => void;
  className?: string;
}

/**
 * Slim rose call-to-action strip for AI roasts. Purely presentational — the
 * insights page and the profile-compare editor wire it to their own roast
 * queries and dialogs.
 */
export function RoastCtaStrip({
  title,
  description,
  badge,
  actionLabel,
  onClick,
  className,
}: RoastCtaStripProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer border-rose-200/70 bg-gradient-to-br from-rose-50 to-white py-0 transition-colors hover:border-rose-300 dark:border-rose-900/40 dark:from-rose-950/20 dark:to-transparent dark:hover:border-rose-900/70",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <Flame className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Clamp instead of truncate — taglines are short sentences and a
                mid-word cut ("Great passport, emp…") reads broken. */}
            <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
            {badge && (
              <Badge
                variant="secondary"
                className="shrink-0 border-0 px-1.5 py-0 font-bold text-rose-600 dark:text-rose-400"
              >
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground truncate text-xs">
              {description}
            </p>
          )}
        </div>

        {/* The whole card is the click target — this is just the affordance. */}
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </CardContent>
    </Card>
  );
}
