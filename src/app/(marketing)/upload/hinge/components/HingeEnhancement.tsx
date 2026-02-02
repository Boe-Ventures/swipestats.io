"use client";

import { useRef, useCallback } from "react";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { HingeConsentForm } from "./HingeConsentForm";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

interface HingeEnhancementProps {
  payload: SwipestatsHingeProfilePayload;
  consent: HingeConsentState;
  onConsentChange: (consent: HingeConsentState) => void;
}

export function HingeEnhancement({
  consent,
  onConsentChange,
}: HingeEnhancementProps) {
  const { trackEvent } = useAnalytics();
  const previousConsent = useRef(consent);

  const handleConsentChange = useCallback(
    (newConsent: HingeConsentState) => {
      // Track photo consent toggle
      if (previousConsent.current.sharePhotos !== newConsent.sharePhotos) {
        trackEvent("upload_consent_photos_toggled", {
          provider: "hinge",
          consentGiven: newConsent.sharePhotos,
        });
      }

      // Track work consent toggle
      if (previousConsent.current.shareWorkInfo !== newConsent.shareWorkInfo) {
        trackEvent("upload_consent_work_toggled", {
          provider: "hinge",
          consentGiven: newConsent.shareWorkInfo,
        });
      }

      previousConsent.current = newConsent;
      onConsentChange(newConsent);
    },
    [trackEvent, onConsentChange],
  );

  return (
    <div className="space-y-4">
      {/* Data Sharing Consent Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <HingeConsentForm value={consent} onChange={handleConsentChange} />
      </div>
    </div>
  );
}
