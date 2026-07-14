"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useLocalStorage } from "@/components/ui/hooks/use-local-storage";
import {
  ACTIVE_SPONSOR_CAMPAIGN,
  isSponsorCampaignActive,
} from "@/lib/sponsorship";

import Header from "./Header";
import { SponsorBar } from "./SponsorBar";

const STORAGE_NAMESPACE = "swipestats:";

export function MarketingHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage({
    key: `sponsor:${ACTIVE_SPONSOR_CAMPAIGN.id}:dismissed`,
    namespace: STORAGE_NAMESPACE,
    defaultValue: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isBlogPage = pathname === "/blog" || pathname.startsWith("/blog/");
  const showSponsorBar =
    mounted &&
    isBlogPage &&
    !dismissed &&
    isSponsorCampaignActive(ACTIVE_SPONSOR_CAMPAIGN);

  return (
    <>
      {showSponsorBar && (
        <SponsorBar
          campaign={ACTIVE_SPONSOR_CAMPAIGN}
          onDismiss={() => setDismissed(true)}
        />
      )}
      <Header container showBanner={showSponsorBar} />
    </>
  );
}
