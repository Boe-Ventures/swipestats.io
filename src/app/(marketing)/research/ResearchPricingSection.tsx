"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { SectionHead, marketingButton } from "../_components/marketing-ui";

type Tier = {
  name: string;
  id: string;
  apiTier: "STARTER" | "STANDARD" | "FRESH" | "PREMIUM" | null;
  price: string;
  description: string;
  features: string[];
  badge?: { label: string; variant: "rose" | "gray" | "pill" };
  popular?: boolean;
  dark?: boolean;
  cta: string;
  twoCol?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Starter Pack",
    id: "starter",
    apiTier: "STARTER",
    price: "$15",
    description: "Test your hypothesis with real data.",
    features: [
      "10 profiles",
      "Email support",
      "Personal use",
      "Great for small projects",
    ],
    cta: "Buy dataset",
  },
  {
    name: "Standard",
    id: "standard",
    apiTier: "STANDARD",
    price: "$50",
    description: "The go-to for creators and researchers.",
    badge: { label: "Best value", variant: "rose" },
    features: [
      "1,000 profiles",
      "Commercial use",
      "Publication rights",
      "$0.05 / profile",
    ],
    cta: "Buy dataset",
  },
  {
    name: "Fresh",
    id: "fresh",
    apiTier: "FRESH",
    price: "$150",
    description: "The most recent data available.",
    badge: { label: "Most popular", variant: "pill" },
    popular: true,
    features: [
      "1,000 newest profiles",
      "Priority support",
      "Commercial + publication",
      "Latest dating trends",
    ],
    cta: "Buy dataset",
  },
  {
    name: "Premium",
    id: "premium",
    apiTier: "PREMIUM",
    price: "$300",
    description: "Serious research with statistical significance.",
    badge: { label: "3,000 profiles", variant: "gray" },
    twoCol: true,
    features: [
      "3,000 newest profiles",
      "Priority support",
      "Deep market analysis",
      "Commercial + publication",
    ],
    cta: "Buy dataset",
  },
  {
    name: "Academic License",
    id: "academic",
    apiTier: null,
    price: "From $1,500",
    description: "For universities and institutional research.",
    badge: { label: "Institutions", variant: "gray" },
    dark: true,
    twoCol: true,
    features: [
      "5,000+ profiles",
      "Custom data requests",
      "Student distribution rights",
      "Monthly ongoing support",
    ],
    cta: "Contact us",
  },
];

function Badge({ badge }: { badge: NonNullable<Tier["badge"]> }) {
  if (badge.variant === "pill") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-600/20 bg-rose-50 px-3 py-1.5 text-[13px] font-semibold leading-none text-rose-700">
        {badge.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.04em] whitespace-nowrap",
        badge.variant === "rose"
          ? "border-rose-600/20 bg-rose-50 text-rose-700"
          : "border-gray-200 bg-gray-100 text-gray-600",
      )}
    >
      {badge.label}
    </span>
  );
}

function TierCard({
  tier,
  loadingTier,
  onCheckout,
}: {
  tier: Tier;
  loadingTier: string | null;
  onCheckout: (tier: Tier) => void;
}) {
  const isLoading = loadingTier === tier.id;

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border p-7",
        tier.popular
          ? "border-2 border-rose-600 shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]"
          : "border-gray-200",
        tier.dark
          ? "border-gray-950 bg-gray-950 text-white"
          : "bg-white text-gray-900",
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span
          className={cn(
            "text-[17px] font-bold",
            tier.popular && "text-rose-600",
          )}
        >
          {tier.name}
        </span>
        {tier.badge ? <Badge badge={tier.badge} /> : null}
      </div>

      <p
        className={cn(
          "mt-2 min-h-[38px] text-[13.5px]",
          tier.dark ? "text-gray-400" : "text-gray-500",
        )}
      >
        {tier.description}
      </p>

      <div className="mt-[18px] text-[38px] font-bold tracking-[-0.03em] tabular-nums">
        {tier.price}
      </div>

      <ul
        className={cn(
          "mt-5 flex-1",
          tier.twoCol ? "grid grid-cols-2 gap-[11px]" : "flex flex-col gap-[11px]",
        )}
      >
        {tier.features.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex gap-2.5 text-[14px]",
              tier.dark ? "text-gray-300" : "text-gray-700",
            )}
          >
            <CheckIcon className="mt-px h-[18px] w-[18px] flex-none text-rose-600" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onCheckout(tier)}
        disabled={isLoading}
        className={cn(
          "mt-6 w-full",
          marketingButton({
            variant: tier.popular ? "primary" : tier.dark ? "white" : "ghost",
          }),
          isLoading && "cursor-wait opacity-50",
        )}
      >
        {isLoading ? "Loading…" : tier.cta}
      </button>
    </div>
  );
}

export function ResearchPricingSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const trpc = useTRPC();
  const { trackEvent } = useAnalytics();

  const createCheckout = useMutation(
    trpc.research.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
      onError: (error) => {
        console.error("Failed to create checkout:", error);
        alert("Failed to create checkout. Please try again.");
        setLoadingTier(null);
      },
    }),
  );

  const handleCheckout = (tier: Tier) => {
    if (tier.id === "academic") {
      trackEvent("dataset_academic_inquiry_clicked", {
        source: "research_pricing",
        price: tier.price,
      });
      window.location.href =
        "mailto:kris@swipestats.io?subject=Academic%20License%20Inquiry";
      return;
    }

    if (!tier.apiTier) return;

    setLoadingTier(tier.id);
    const price = Number(tier.price.replace(/[^0-9.]/g, ""));
    trackEvent("dataset_checkout_clicked", {
      tier: tier.apiTier,
      price,
      source: "research_pricing",
    });
    createCheckout.mutate({
      tier: tier.apiTier,
      surface: "research_pricing",
    });
  };

  const topTiers = tiers.slice(0, 3);
  const bottomTiers = tiers.slice(3);

  return (
    <section id="pricing" className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Pricing"
          title="Choose your dataset"
          lead="For a blog, a paper, or plain curiosity, a SwipeStats dataset gets you on the right track. Start free."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 max-[900px]:mx-auto max-[900px]:max-w-[420px] lg:grid-cols-3">
          {topTiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              loadingTier={loadingTier}
              onCheckout={handleCheckout}
            />
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 max-[900px]:mx-auto max-[900px]:max-w-[420px] lg:grid-cols-2">
          {bottomTiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              loadingTier={loadingTier}
              onCheckout={handleCheckout}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
