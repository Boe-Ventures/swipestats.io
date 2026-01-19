"use client";

import Link from "next/link";
import { Map, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * CTA card promoting the Profile Directory and Map
 */
export function DirectoryCtaCard() {
  return (
    <Card className="shadow-lg transition-shadow hover:shadow-xl">
      <CardContent className="flex flex-col p-8">
        {/* Icon & Title */}
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <Map className="text-muted-foreground h-5 w-5" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Explore the Directory
          </h3>
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-6 text-base leading-7">
          Browse thousands of dating profiles from real users around the world.
          See insights, statistics, and compare yourself to others on the
          interactive map.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-x-4">
          <Link href="/directory">
            <Button>
              <Users className="mr-2 h-4 w-4" />
              Browse Profiles
            </Button>
          </Link>
          <Link
            href="/directory?view=map"
            className="text-sm leading-6 font-semibold hover:underline"
          >
            View Map <span aria-hidden="true">→</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
