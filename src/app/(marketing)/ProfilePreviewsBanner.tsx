"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/banner";

const DISMISS_KEY = "swipestats:profile-previews-banner-dismissed";

/**
 * Homepage announcement for the Profile Previews (profile-compare) feature.
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
      badge="New"
      title="Profile Previews"
      message="A/B test your dating photos and prompts, then see what people actually notice first."
      ctaText="Try it free"
      ctaHref="/app/profile-compare"
      showDismiss
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }}
    />
  );
}
