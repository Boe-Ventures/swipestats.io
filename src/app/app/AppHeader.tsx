"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SwipeStatsMark } from "@/components/ui/SwipeStatsMark";

import { UserDropdown } from "./UserDropdown";
import type { Session } from "@/server/better-auth/config";

interface AppHeaderProps {
  session: Session;
}

export function AppHeader({ session }: AppHeaderProps) {
  return (
    <nav className="dark:bg-card border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center space-x-6">
          <Link href="/app/dashboard" className="flex items-center space-x-2">
            <div className="bg-brand-rose flex size-7 items-center justify-center rounded-md text-white sm:size-8">
              <SwipeStatsMark className="size-5 sm:size-6" />
            </div>
            <span className="text-xl font-bold">SwipeStats</span>
          </Link>
          <div className="hidden items-center space-x-1 md:flex">
            <Link href="/app/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/app/profile-compare/photos">
              <Button variant="ghost" size="sm">
                Photos
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side - User Dropdown */}
        <div className="flex items-center space-x-2">
          <UserDropdown user={session.user} />
        </div>
      </div>
    </nav>
  );
}
