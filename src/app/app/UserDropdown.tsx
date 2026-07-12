"use client";

import { LogOut, User, Settings, Sun, Moon, Monitor } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemeMode } from "@/components/ui/theme";
import { cn } from "@/components/ui/lib/utils";

import { authClient } from "@/server/better-auth/client";
import type { Session } from "@/server/better-auth/config";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { env } from "@/env";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "auto", label: "System", icon: Monitor },
];

/**
 * Dev-only theme switcher. Hidden on real production (VERCEL_ENV=production)
 * since dark mode isn't a supported user-facing feature yet — it's exposed
 * in local dev and preview deploys for testing.
 */
function ThemeSwitcher() {
  const { themeMode, setTheme } = useTheme();

  if (env.NEXT_PUBLIC_IS_PRODUCTION) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5">
        <div className="bg-muted flex items-center gap-0.5 rounded-md p-0.5">
          {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              aria-pressed={themeMode === mode}
              aria-label={label}
              title={label}
              className={cn(
                "flex flex-1 items-center justify-center rounded-sm py-1 transition-colors",
                themeMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

interface UserDropdownProps {
  user: Session["user"];
}

export function UserDropdown({ user }: UserDropdownProps) {
  const { trackEvent } = useAnalytics();

  const handleSignOut = async () => {
    trackEvent("sign_out_clicked", undefined);
    await authClient.signOut();
    // Hard navigation, not router.push: it drops the whole JS heap (React
    // Query cache included), so the next session can't see this one's data.
    window.location.href = "/";
  };

  // Generate initials from name or email
  const getInitials = () => {
    const name = user.name || user.email;
    if (!name) return "U";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user.name || user.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || undefined} alt={displayName} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end" keepMounted>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="truncate text-sm leading-none font-medium">
              {displayName}
            </p>
            {user.email && (
              <p
                className="text-muted-foreground truncate text-xs leading-none"
                title={user.email}
              >
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem href="/app/dashboard">
            <User className="mr-2 h-4 w-4" />
            Dashboard
          </DropdownMenuLinkItem>
          <DropdownMenuLinkItem href="/app/account">
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuLinkItem>
        </DropdownMenuGroup>
        <ThemeSwitcher />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
