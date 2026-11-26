"use client";

import { SimpleDialog } from "@/components/ui/dialog";
import { SwipestatsPlusCard } from "@/app/(marketing)/insights/tinder/[tinderId]/compare/_components/SwipestatsPlusCard";

interface SwipestatsPlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * MVP: Simple upgrade modal that only shows SwipeStats Plus tier
 * Elite tier will be added in future iterations
 */
export function SwipestatsPlanUpgradeModal({
  open,
  onOpenChange,
}: SwipestatsPlanUpgradeModalProps) {
  return (
    <SimpleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upgrade to SwipeStats+"
      description="Unlock deeper insights and premium features for your dating profile"
      size="2xl"
    >
      <SwipestatsPlusCard />
    </SimpleDialog>
  );
}
