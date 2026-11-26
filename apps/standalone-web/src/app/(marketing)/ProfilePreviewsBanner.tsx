"use client";

import { useEffect, useState } from "react";

import { Banner } from "@/components/ui/banner";

const DISMISS_KEY = "swipestats:profile-previews-banner-dismissed:v2";

/**
 * Homepage announcement for the Profile Comparisons (profile-compare) feature.
 * Dismissible, and the dismissal persists across visits via localStorage so
 * returning visitors aren't nagged. Renders nothing until mounted to avoid a
 * hydration mismatch (server has no access to localStorage).
 */
export function ProfilePreviewsBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <Banner
      title="Profile Comparisons"
      message="Get ratings from friends on your photos and prompts."
      badge="New"
      ctaText="Try it free"
      ctaHref="/try?utm_source=swipestats&utm_medium=homepage_banner&utm_campaign=profile_comparisons"
      showDismiss
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }}
    />
  );
}
