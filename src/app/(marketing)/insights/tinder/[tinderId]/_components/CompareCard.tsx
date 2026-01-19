"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTinderProfile } from "../TinderProfileProvider";

/**
 * CTA card for navigating to the analytics comparison page
 */
export function CompareCard() {
  const router = useRouter();
  const { tinderId } = useTinderProfile();

  const handleClick = () => {
    router.push(`/insights/tinder/${tinderId}/compare`);
  };

  return (
    <Card className="h-full pb-0 shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-bold">Compare profiles</h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleClick}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-muted-foreground mt-3 text-sm">
          Compare your swipe analytics and match rates with other Tinder
          profiles
        </p>
      </CardHeader>
    </Card>
  );
}
