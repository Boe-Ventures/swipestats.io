"use client";

import {
  Calendar,
  BarChart3,
  MessageSquare,
  Share2,
  Route,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";

export function QuickActionsCard() {
  const router = useRouter();
  const { tinderId } = useTinderProfile();

  const actions = [
    {
      label: "View Journey",
      icon: Route,
      onClick: () => {
        router.push(`/insights/tinder/${tinderId}/journey`);
      },
      color:
        "hover:bg-pink-50 hover:text-pink-700 dark:hover:bg-pink-950 dark:hover:text-pink-300",
    },
    {
      label: "Life Events",
      icon: Calendar,
      onClick: () => {
        router.push("/app/dashboard");
      },
      color:
        "hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-300",
    },
    {
      label: "Compare Profiles",
      icon: BarChart3,
      onClick: () => {
        router.push(`/insights/tinder/${tinderId}/compare`);
      },
      color:
        "hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950 dark:hover:text-purple-300",
    },
    {
      label: "Analyze Messages",
      icon: MessageSquare,
      onClick: () => {
        const messagesSection = document.getElementById("messages-meta");
        messagesSection?.scrollIntoView({ behavior: "smooth" });
      },
      color:
        "hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-950 dark:hover:text-cyan-300",
    },
    {
      label: "Share Stats",
      icon: Share2,
      onClick: () => {
        // TODO: Implement share functionality
        if (navigator.share) {
          navigator
            .share({
              title: "My SwipeStats",
              text: "Check out my Tinder stats!",
              url: window.location.href,
            })
            .catch(() => {
              // Fallback: copy to clipboard
              navigator.clipboard.writeText(window.location.href);
            });
        } else {
          navigator.clipboard.writeText(window.location.href);
        }
      },
      color:
        "hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-300",
    },
  ];

  return (
    <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className={`w-full justify-start gap-3 transition-colors ${action.color}`}
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs sm:text-sm">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
