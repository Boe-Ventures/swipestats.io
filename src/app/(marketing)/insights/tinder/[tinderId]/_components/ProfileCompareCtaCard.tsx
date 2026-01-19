"use client";

import Link from "next/link";
import { LayoutGrid, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * CTA card promoting the Visual Profile Compare feature
 */
export function ProfileCompareCtaCard() {
  return (
    <Card className="shadow-lg transition-shadow hover:shadow-xl">
      <CardContent className="flex flex-col p-8">
        {/* Icon & Title */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <LayoutGrid className="text-muted-foreground h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Compare Your Dating App Profiles
          </h3>
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-6 text-base leading-7">
          Create beautiful side-by-side comparisons of your Tinder, Hinge, and
          Bumble profiles. Share with friends or use for feedback.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-x-4">
          <Link href="/app/profile-compare">
            <Button>
              Compare My Profiles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm font-medium">
            Free to use
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
