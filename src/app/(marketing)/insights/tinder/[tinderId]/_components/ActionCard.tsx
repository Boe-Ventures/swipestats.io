"use client";

import { MessageCircle, UserCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Action card with quick actions for the user
 */
export function ActionCard() {
  return (
    <Card className="shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-950 dark:hover:text-cyan-300"
            onClick={() => {
              // TODO: Navigate to messages section or scroll to messaging chart
              const messagingSection =
                document.getElementById("messaging-chart");
              messagingSection?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <MessageCircle className="h-5 w-5" />
            <span>Dive into your messages</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950 dark:hover:text-purple-300"
            onClick={() => {
              // TODO: Navigate to profile completion page
              console.log("Navigate to profile completion");
            }}
          >
            <UserCircle className="h-5 w-5" />
            <span>Complete your profile</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 transition-colors hover:bg-gradient-to-r hover:from-pink-50 hover:to-orange-50 hover:text-pink-700 dark:hover:from-pink-950 dark:hover:to-orange-950 dark:hover:text-pink-300"
            onClick={() => {
              // TODO: Navigate to upgrade page
              console.log("Navigate to upgrade page");
            }}
          >
            <Sparkles className="h-5 w-5" />
            <span>Upgrade your account</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
