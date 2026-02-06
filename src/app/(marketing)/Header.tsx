import Link from "next/link";
// import { BarChart3 } from "lucide-react";

import { cn } from "@/components/ui";
// import { OldSwipestatsLogo } from "@/components/ui/OldSwipestatsLogo";
import { NewOldLogo } from "@/components/ui/NewOldLogo";
// import { TinderInsights } from "@/components/ui/TinderInsights";

import HeaderClient from "./HeaderClient";

// Navigation structure for the header
const navigation = {
  product: [
    {
      name: "Features",
      description: "See what SwipeStats can do for you",
      href: "/#how-it-works",
      icon: "ChartPieIcon" as const,
    },
    {
      name: "How it Works",
      description: "Learn how to analyze your dating data",
      href: "/#how-it-works",
      icon: "CursorArrowRaysIcon" as const,
    },
    {
      name: "About",
      description: "Discover our mission and story",
      href: "/#about",
      icon: "FingerPrintIcon" as const,
    },
  ],
  callsToAction: [
    {
      name: "Contact",
      href: "mailto:kris@swipestats.io",
      icon: "PhoneIcon" as const,
    },
  ],
  simple: [
    { name: "Research", href: "/#pricing" },
    { name: "Blog", href: "/blog" },
    { name: "FAQ", href: "/#faq" },
    { name: "Contact", href: "mailto:kris@swipestats.io" },
  ],
};

interface HeaderProps {
  container?: boolean;
  showBanner?: boolean;
}

export default function Header({
  container = false,
  showBanner = false,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "bg-background/10 border-border/20 sticky inset-x-0 z-30 border-b backdrop-blur-sm",
        showBanner ? "top-28 md:top-16 lg:top-12" : "top-0",
      )}
    >
      <nav
        aria-label="Global"
        className={cn(
          "flex items-center justify-between p-6 lg:px-8",
          container ? "mx-auto max-w-7xl" : "mx-auto max-w-7xl",
        )}
      >
        {/* Logo Section */}
        <div className="flex lg:flex-1">
          <Link href="/" className="flex items-center space-x-2">
            {/* Original logo with BarChart icon */}
            {/* <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <BarChart3 className="size-4" />
            </div> */}

            {/* Standalone SVG flame logo (full color) */}
            {/* <OldSwipestatsLogo className="h-8 w-auto" /> */}

            {/* White flame in red container */}
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md sm:size-8">
              <NewOldLogo className="size-5 sm:size-6" />
            </div>

            {/* Tinder Insights logo in red container */}
            {/* <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
              <TinderInsights className="size-6" />
            </div> */}
            <span className="text-xl font-bold">SwipeStats</span>
          </Link>
        </div>

        <HeaderClient navigation={navigation} />
      </nav>
    </header>
  );
}
