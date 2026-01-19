"use client";

import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { HingeConsentForm } from "./HingeConsentForm";

interface HingeEnhancementProps {
  payload: SwipestatsHingeProfilePayload;
  consent: HingeConsentState;
  onConsentChange: (consent: HingeConsentState) => void;
}

export function HingeEnhancement({
  consent,
  onConsentChange,
}: HingeEnhancementProps) {
  return (
    <div className="space-y-4">
      {/* Data Sharing Consent Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <HingeConsentForm value={consent} onChange={onConsentChange} />
      </div>
    </div>
  );
}
