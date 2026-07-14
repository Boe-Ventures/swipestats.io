"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAnalytics } from "@/contexts/AnalyticsProvider";
import type { SponsorCampaign, SponsorPlacement } from "@/lib/sponsorship";

export function useSponsorTracking(
  campaign: SponsorCampaign,
  placement: SponsorPlacement,
) {
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();
  const sponsorRef = useRef<HTMLElement>(null);
  const impressionTracked = useRef(false);

  const eventProperties = {
    campaignId: campaign.id,
    placement,
    sourcePath: pathname,
    sponsorName: campaign.sponsorName,
  } as const;

  useEffect(() => {
    const element = sponsorRef.current;

    if (!element || impressionTracked.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || impressionTracked.current) return;

        impressionTracked.current = true;
        trackEvent("sponsor_impression", eventProperties);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [eventProperties, trackEvent]);

  const trackClick = useCallback(() => {
    if (campaign.kind === "house") {
      trackEvent("sponsor_inquiry_clicked", eventProperties);
      return;
    }

    trackEvent("sponsor_clicked", eventProperties);
  }, [campaign.kind, eventProperties, trackEvent]);

  return { sponsorRef, trackClick };
}
