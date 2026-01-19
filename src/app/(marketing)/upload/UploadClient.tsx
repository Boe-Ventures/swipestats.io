"use client";

import { parseAsString, useQueryState } from "nuqs";
import { ProviderSelector } from "./_components/ProviderSelector";
import { TinderEducationalContent } from "./flows/TinderEducationalContent";
import { HingeEducationalContent } from "./flows/HingeEducationalContent";
import { BumbleEducationalContent } from "./flows/BumbleEducationalContent";

export function UploadClient() {
  const [provider] = useQueryState("provider", parseAsString.withDefault(""));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      <div className="space-y-6">
        {/* Provider Selector - always visible */}
        <ProviderSelector />

        {/* Educational Content - shown when provider selected */}
        {provider === "tinder" && <TinderEducationalContent />}
        {provider === "hinge" && <HingeEducationalContent />}
        {provider === "bumble" && <BumbleEducationalContent />}
      </div>
    </div>
  );
}
