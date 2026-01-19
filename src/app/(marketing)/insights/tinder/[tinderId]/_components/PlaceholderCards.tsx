"use client";

import { Plus, Sparkles, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Placeholder cards for future features and marketing upsells
 */
export function PlaceholderCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Add Comparison Placeholder */}
      <Card className="group shadow-sm transition-all duration-300 hover:shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted group-hover:bg-primary/10 mb-4 rounded-full p-3 transition-colors">
            <Plus className="text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors" />
          </div>
          <h3 className="mb-2 font-semibold">Add Comparison</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Compare your stats with friends or see how you stack up
          </p>
          <Button variant="outline" size="sm" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      {/* AI Insights Placeholder */}
      <Card className="group shadow-sm transition-all duration-300 hover:shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted mb-4 rounded-full p-3 transition-colors group-hover:bg-purple-100 dark:group-hover:bg-purple-950">
            <Sparkles className="text-muted-foreground h-6 w-6 transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </div>
          <h3 className="mb-2 font-semibold">AI-Powered Insights</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Get personalized recommendations to improve your dating game
          </p>
          <Button variant="outline" size="sm" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      {/* Benchmarking Placeholder */}
      <Card className="group shadow-sm transition-all duration-300 hover:shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-muted mb-4 rounded-full p-3 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-950">
            <TrendingUp className="text-muted-foreground h-6 w-6 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </div>
          <h3 className="mb-2 font-semibold">Benchmarking</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            See how your stats compare to global averages
          </p>
          <Button variant="outline" size="sm" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
