"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface ComposeProfileCardProps {
  shareKey: string;
  profileName?: string;
  /** Full-width layout for the mobile placement below the tabs. */
  fullWidth?: boolean;
}

/**
 * Persistent "make your own version" call to action. Sends the viewer to the
 * friend-creation flow where they pick photos from the owner's library and
 * arrange them into their own take on the profile.
 */
export function ComposeProfileCard({
  shareKey,
  profileName,
  fullWidth,
}: ComposeProfileCardProps) {
  const who = profileName ? `${profileName}'s` : "their";

  return (
    <Link
      href={`/share/create/${shareKey}`}
      className={
        fullWidth
          ? "border-primary/30 hover:border-primary/60 hover:bg-primary/5 group flex items-center gap-4 rounded-xl border-2 border-dashed p-5 transition-colors"
          : "border-primary/30 hover:border-primary/60 hover:bg-primary/5 group flex aspect-[2/3] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors"
      }
    >
      <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors">
        <Sparkles className="h-6 w-6" />
      </span>
      <span className={fullWidth ? "flex-1 text-left" : "mt-4"}>
        <span
          className={
            fullWidth
              ? "flex items-center gap-1.5 font-semibold"
              : "flex items-center justify-center gap-1.5 font-semibold"
          }
        >
          Make your own version
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
        <span className="text-muted-foreground mt-1 block text-sm">
          Pick photos from {who} library and arrange them into the profile you
          think works best.
        </span>
      </span>
    </Link>
  );
}
