"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/lib/utils";

import type { LucideIcon } from "lucide-react";

export interface NextAction {
  key: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip (bg + text color). */
  iconClassName: string;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface NextActionsRowProps {
  actions: NextAction[];
}

/**
 * The "what should I do next" strip — the dashboard's engagement engine.
 * Pure presentation; Dashboard2Client decides which actions apply and in
 * what priority order.
 */
export function NextActionsRow({ actions }: NextActionsRowProps) {
  if (actions.length === 0) return null;

  return (
    <div>
      <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
        Next up
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((action) => {
          const body = (
            <Card className="group h-full cursor-pointer py-0 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex h-full items-center gap-3 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    action.iconClassName,
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{action.title}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {action.description}
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          );

          return action.href ? (
            <Link key={action.key} href={action.href} className="block">
              {body}
            </Link>
          ) : (
            <button
              key={action.key}
              onClick={action.onClick}
              className="block w-full text-left"
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
