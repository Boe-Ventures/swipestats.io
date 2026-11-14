"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Upload, Mail, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui";
import { SwipestatsPlanUpgradeModal } from "@/app/app/components/SwipestatsPlanUpgradeModal";

type CTAType = "upload" | "newsletter" | "premium";

interface DirectoryCTACardProps {
  type: CTAType;
}

const ctaConfig: Record<
  CTAType,
  {
    title: string;
    description: string;
    buttonText: string;
    href: string;
    icon: typeof Upload;
    badgeText: string;
    iconColor: string;
    badgeColor: string;
  }
> = {
  upload: {
    title: "Upload Your Profile",
    description: "Discover your dating statistics and join the community",
    buttonText: "Get Started",
    href: "/upload?provider=tinder",
    icon: Upload,
    badgeText: "Free",
    iconColor: "text-pink-500",
    badgeColor:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  },
  newsletter: {
    title: "Get Dating Tips",
    description: "Weekly insights and tips delivered to your inbox",
    buttonText: "Subscribe",
    href: "#newsletter",
    icon: Mail,
    badgeText: "Free",
    iconColor: "text-blue-500",
    badgeColor:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  premium: {
    title: "Unlock Advanced Insights",
    description:
      "Compare your stats with demographics and get detailed analytics",
    buttonText: "View Plans",
    href: "/#pricing", // Not used for premium type, kept for type compatibility
    icon: Sparkles,
    badgeText: "Premium",
    iconColor: "text-purple-500",
    badgeColor:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
};

export function DirectoryCTACard({ type }: DirectoryCTACardProps) {
  const config = ctaConfig[type];
  const Icon = config.icon;
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // For premium type, use button with modal instead of link
  if (type === "premium") {
    return (
      <>
        <button
          onClick={() => setUpgradeModalOpen(true)}
          className="group block w-full text-left"
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-gray-900 p-5 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl">
            {/* Background gradient overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-50">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative flex h-full flex-col">
              {/* Header with badge and icon */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/10 text-white"
                  >
                    {config.badgeText}
                  </Badge>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {config.title}
                  </h3>
                </div>
                {/* Icon in top right */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                </div>
              </div>

              {/* Description */}
              <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-300">
                {config.description}
              </p>

              {/* CTA Button */}
              <div className="rounded-lg bg-white/10 p-2.5 backdrop-blur-sm transition-colors group-hover:bg-white/20">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
                    {config.buttonText}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>
        <SwipestatsPlanUpgradeModal
          open={upgradeModalOpen}
          onOpenChange={setUpgradeModalOpen}
        />
      </>
    );
  }

  // For other types, use link as before
  return (
    <Link href={config.href} className="group block">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-gray-900 p-5 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl">
        {/* Background gradient overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div
            className={cn(
              "absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl",
              type === "upload" && "bg-pink-500/30",
              type === "newsletter" && "bg-blue-500/30",
            )}
          />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col">
          {/* Header with badge and icon */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex-1">
              <Badge
                variant="outline"
                className="border-white/20 bg-white/10 text-white"
              >
                {config.badgeText}
              </Badge>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {config.title}
              </h3>
            </div>
            {/* Icon in top right */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
          </div>

          {/* Description */}
          <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-300">
            {config.description}
          </p>

          {/* CTA Button */}
          <div className="rounded-lg bg-white/10 p-2.5 backdrop-blur-sm transition-colors group-hover:bg-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white">
                {config.buttonText}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
