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
      ctaText="Explore research"
      ctaHref="/research?utm_source=swipestats&utm_medium=homepage_banner&utm_campaign=research_datasets"
      showDismiss
      compactCta
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }}
    />
  );
}
