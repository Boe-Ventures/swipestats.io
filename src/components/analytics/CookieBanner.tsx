"use client";

import * as React from "react";
import { Cookie } from "lucide-react";

import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";
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
  onAccept: () => void;
  onDecline: () => void;
  description?: string;
  learnMoreHref?: string;
  className?: string;
}

export const CookieBanner = ({
  isOpen,
  onAccept,
  onDecline,
  description = "We use cookies to improve your experience and analyze site usage. By continuing, you accept our use of cookies.",
  learnMoreHref = "/privacy",
  className,
}: CookieBannerProps) => {
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

  const handleAccept = React.useCallback(() => {
    setIsAnimatingOut(true);
    onAccept();
  }, [onAccept]);

  const handleDecline = React.useCallback(() => {
    setIsAnimatingOut(true);
    onDecline();
  }, [onDecline]);

  // Reset animation state when reopened
  React.useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
    }
  }, [isOpen]);

  // Don't render if not open and not animating
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
          <p className="text-muted-foreground text-xs">
            By clicking <span className="font-medium">&quot;Accept&quot;</span>,
            you agree to our use of cookies.
          </p>
          <a
            href={learnMoreHref}
            className="text-primary text-xs underline underline-offset-4 hover:no-underline"
          >
            Learn more
          </a>
        </CardContent>
        <CardFooter className="flex gap-2 pt-2">
          <Button
            onClick={handleDecline}
            variant="secondary"
            className="flex-1"
          >
            Decline
          </Button>
          <Button onClick={handleAccept} className="flex-1">
            Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Component to re-show consent banner for users who previously declined
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
