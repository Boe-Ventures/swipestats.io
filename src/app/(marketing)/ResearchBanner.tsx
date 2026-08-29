"use client";

import { useEffect, useState } from "react";

import { Banner } from "@/components/ui/banner";

const DISMISS_KEY = "swipestats:research-banner-dismissed:v1";

/**
 * Homepage announcement for SwipeStats research datasets. Dismissal persists
 * across visits, with a campaign-specific key so earlier announcements do not
 * suppress this one.
 */
export function ResearchBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <Banner
      title="Real dating data"
      message="Anonymized swipes, matches, and messages from 12,000+ users."
      badge="Research"
      ctaText={
        <>
          <span className="sm:hidden">Explore</span>
          <span className="hidden sm:inline">Explore research</span>
        </>
      }
      ctaHref="/research?source=home_banner"
      showDismiss
      compactMobile
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }}
    />
  );
}
