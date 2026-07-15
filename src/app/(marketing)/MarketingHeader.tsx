"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useLocalStorage } from "@/components/ui/hooks/use-local-storage";
import {
  ACTIVE_SPONSOR_CAMPAIGN,
  isSponsorCampaignActive,
} from "@/lib/sponsorship";

import { CatalogListingBar } from "./CatalogListingBar";
import Header from "./Header";
import { SponsorBar } from "./SponsorBar";

const STORAGE_NAMESPACE = "swipestats:";

export function MarketingHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sponsorDismissed, setSponsorDismissed] = useLocalStorage({
    key: `sponsor:${ACTIVE_SPONSOR_CAMPAIGN.id}:dismissed`,
    namespace: STORAGE_NAMESPACE,
    defaultValue: false,
  });
  const [catalogDismissed, setCatalogDismissed] = useLocalStorage({
    key: "catalog:list-with-us-v1:dismissed",
    namespace: STORAGE_NAMESPACE,
    defaultValue: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isBlogPage = pathname === "/blog" || pathname.startsWith("/blog/");
  const isCatalogPage =
    pathname === "/dating-services" || pathname.startsWith("/dating-services/");
  const showSponsorBar =
    mounted &&
    isBlogPage &&
    !sponsorDismissed &&
    isSponsorCampaignActive(ACTIVE_SPONSOR_CAMPAIGN);
  const showCatalogBar = mounted && isCatalogPage && !catalogDismissed;
  const showBanner = showSponsorBar || showCatalogBar;

  return (
    <>
      {showSponsorBar && (
        <SponsorBar
          campaign={ACTIVE_SPONSOR_CAMPAIGN}
          onDismiss={() => setSponsorDismissed(true)}
        />
      )}
      {showCatalogBar && (
        <CatalogListingBar onDismiss={() => setCatalogDismissed(true)} />
      )}
      <Header container showBanner={showBanner} />
    </>
  );
}
