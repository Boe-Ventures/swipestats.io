"use client";

import { useEffect, useState } from "react";

import { useLocalStorage } from "@/components/ui/hooks/use-local-storage";

import Header from "./Header";
import { SponsorBar } from "./SponsorBar";

const DISMISS_KEY = "sponsor-bar-dismissed:v1";
const STORAGE_NAMESPACE = "swipestats:";
const SPONSOR_EMAIL =
  "mailto:paw@swipestats.io?subject=SwipeStats%20sponsorship%20inquiry";

export function MarketingHeader() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage({
    key: DISMISS_KEY,
    namespace: STORAGE_NAMESPACE,
    defaultValue: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const showSponsorBar = mounted && !dismissed;

  return (
    <>
      {showSponsorBar && (
        <SponsorBar
          label="Sponsor"
          message="Want to sponsor SwipeStats?"
          ctaText="Let's talk"
          href={SPONSOR_EMAIL}
          onDismiss={() => setDismissed(true)}
        />
      )}
      <Header container showBanner={showSponsorBar} />
    </>
  );
}
