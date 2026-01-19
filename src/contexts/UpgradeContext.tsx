"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { SwipestatsPlanUpgradeModal } from "@/app/app/components/SwipestatsPlanUpgradeModal";
import type { SwipestatsTier } from "@/lib/constants/pricing";

interface UpgradeOptions {
  tier?: SwipestatsTier;
  feature?: string;
}

interface UpgradeContextValue {
  openUpgradeModal: (options?: UpgradeOptions) => void;
  closeUpgradeModal: () => void;
  isOpen: boolean;
}

const UpgradeContext = createContext<UpgradeContextValue | undefined>(
  undefined,
);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openUpgradeModal = useCallback((_options?: UpgradeOptions) => {
    // Note: options.tier and options.feature can be used in the future
    // when we support multiple tiers in the upgrade modal
    setIsOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <UpgradeContext.Provider
      value={{ openUpgradeModal, closeUpgradeModal, isOpen }}
    >
      {children}
      <SwipestatsPlanUpgradeModal open={isOpen} onOpenChange={setIsOpen} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade() {
  const context = useContext(UpgradeContext);
  if (context === undefined) {
    throw new Error("useUpgrade must be used within an UpgradeProvider");
  }
  return context;
}
