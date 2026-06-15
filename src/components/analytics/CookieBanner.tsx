"use client";

import * as React from "react";
import { Cookie } from "lucide-react";

import { cn } from "@/components/ui/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

interface CookieBannerProps {
  isOpen: boolean;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  description?: string;
  className?: string;
}

/**
 * First-layer consent banner. "Accept all" and "Reject all" are rendered with
 * identical prominence (same variant, size, and width) — GDPR requires
 * rejecting to be as easy as accepting. "Customize" links to /cookies for
 * per-category control.
 */
export const CookieBanner = ({
  isOpen,
  onAcceptAll,
  onRejectAll,
  description = "We use cookies for analytics and to improve SwipeStats. Choose what you're comfortable with — you can change this anytime.",
  className,
}: CookieBannerProps) => {
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

  const handleAcceptAll = React.useCallback(() => {
    setIsAnimatingOut(true);
    onAcceptAll();
  }, [onAcceptAll]);

  const handleRejectAll = React.useCallback(() => {
    setIsAnimatingOut(true);
    onRejectAll();
  }, [onRejectAll]);

  // Reset animation state when reopened
  React.useEffect(() => {
    if (isOpen) setIsAnimatingOut(false);
  }, [isOpen]);

  if (!isOpen && !isAnimatingOut) return null;

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-50 w-full transition-all duration-700 sm:bottom-4 sm:left-4 sm:max-w-md",
        isAnimatingOut || !isOpen
          ? "translate-y-full opacity-0"
          : "translate-y-0 opacity-100",
        className,
      )}
    >
      <Card className="m-3 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">We use cookies</CardTitle>
          <Cookie className="h-5 w-5" />
        </CardHeader>
        <CardContent className="space-y-2">
          <CardDescription className="text-sm">{description}</CardDescription>
          <div className="flex gap-3 text-xs">
            <a
              href="/cookies"
              className="text-primary underline underline-offset-4 hover:no-underline"
            >
              Customize
            </a>
            <a
              href="/privacy"
              className="text-muted-foreground underline underline-offset-4 hover:no-underline"
            >
              Privacy policy
            </a>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <div className="flex w-full gap-2">
            {/* Equal prominence: same variant, size, and width. */}
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="flex-1"
            >
              Reject all
            </Button>
            <Button
              onClick={handleAcceptAll}
              variant="outline"
              className="flex-1"
            >
              Accept all
            </Button>
          </div>
          <ButtonLink href="/cookies" variant="ghost" className="w-full">
            Customize preferences
          </ButtonLink>
        </CardFooter>
      </Card>
    </div>
  );
};

// Link that re-opens the first-layer banner (e.g. from a footer).
interface CookiePreferencesLinkProps {
  children?: React.ReactNode;
  className?: string;
}

export const CookiePreferencesLink = ({
  children = "Manage Cookie Preferences",
  className = "text-primary text-sm underline underline-offset-4 hover:no-underline cursor-pointer",
}: CookiePreferencesLinkProps) => {
  const { reShowConsentBanner } = useAnalytics();

  const handleClick = React.useCallback(() => {
    reShowConsentBanner();
  }, [reShowConsentBanner]);

  return (
    <span
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {children}
    </span>
  );
};
