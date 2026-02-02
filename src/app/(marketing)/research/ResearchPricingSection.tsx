"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";

const tiers = [
  {
    name: "Starter Pack",
    id: "starter",
    apiTier: "STARTER" as const,
    price: "$15",
    description: "Test your hypothesis with real data",
    features: [
      "10 profiles",
      "Email support",
      "Personal use",
      "Great for small projects",
    ],
    mostPopular: false,
  },
  {
    name: "Standard Dataset",
    id: "standard",
    apiTier: "STANDARD" as const,
    price: "$50",
    description: "The go-to choice for content creators and researchers",
    features: [
      "1,000 profiles",
      "Email support",
      "Commercial use ✓",
      "Publication rights ✓",
      "Mixed data recency",
      "Best price per profile ($0.05)",
    ],
    mostPopular: false,
  },
  {
    name: "Fresh Dataset",
    id: "fresh",
    apiTier: "FRESH" as const,
    price: "$150",
    description: "Get the most recent data available",
    features: [
      "1,000 profiles (most recent)",
      "Priority email support",
      "Commercial use ✓",
      "Publication rights ✓",
      "Latest dating trends",
      "Current market insights",
    ],
    mostPopular: true,
  },
  {
    name: "Premium Dataset",
    id: "premium",
    apiTier: "PREMIUM" as const,
    price: "$300",
    description: "Serious research with comprehensive data",
    features: [
      "3,000 profiles (most recent)",
      "Priority email support",
      "Commercial use ✓",
      "Publication rights ✓",
      "Statistical significance",
      "Deep market analysis",
    ],
    mostPopular: false,
  },
  {
    name: "Academic License",
    id: "academic",
    apiTier: null,
    price: "From $1,500",
    description: "For universities and institutional research",
    features: [
      "5,000+ profiles",
      "Custom data requests",
      "Priority support",
      "Monthly ongoing support",
      "Student distribution rights ✓",
      "Custom timeframes available",
    ],
    mostPopular: false,
  },
];

export function ResearchPricingSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const trpc = useTRPC();

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

  const handleCheckout = (tier: (typeof tiers)[number]) => {
    if (tier.id === "academic") {
      window.location.href =
        "mailto:kris@swipestats.io?subject=Academic%20License%20Inquiry";
      return;
    }

    if (!tier.apiTier) return;

    setLoadingTier(tier.id);
    createCheckout.mutate({ tier: tier.apiTier });
  };

  return (
    <div id="pricing" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base/7 font-semibold text-rose-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose Your Dataset
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg/8 text-gray-600">
          Whether it&apos;s for a blog, a research paper, or plain curiosity, a
          dataset from SwipeStats will get you on the right track.
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.slice(0, 3).map((tier) => (
            <div
              key={tier.id}
              className={cn(
                tier.mostPopular
                  ? "ring-2 ring-rose-600"
                  : "ring-1 ring-gray-200",
                "flex flex-col justify-between rounded-3xl bg-white p-8 xl:p-10",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={cn(
                      tier.mostPopular ? "text-rose-600" : "text-gray-900",
                      "text-lg/8 font-semibold",
                    )}
                  >
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-rose-600/10 px-2.5 py-1 text-xs/5 font-semibold text-rose-600">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm/6 text-gray-600">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {tier.price}
                  </span>
                </p>
                <ul
                  role="list"
                  className="mt-8 space-y-3 text-sm/6 text-gray-600"
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon
                        className="h-6 w-5 flex-none text-rose-600"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleCheckout(tier)}
                disabled={loadingTier === tier.id}
                aria-describedby={tier.id}
                className={cn(
                  tier.mostPopular
                    ? "bg-rose-600 text-white shadow-sm hover:bg-rose-500"
                    : "text-rose-600 ring-1 ring-rose-200 ring-inset hover:ring-rose-300",
                  "mt-8 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                  loadingTier === tier.id && "cursor-wait opacity-50",
                )}
              >
                {loadingTier === tier.id ? "Loading..." : "Buy dataset"}
              </button>
            </div>
          ))}
        </div>
        <div className="isolate mx-auto mt-8 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {tiers.slice(3).map((tier) => (
            <div
              key={tier.id}
              className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10"
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className="text-lg/8 font-semibold text-gray-900"
                  >
                    {tier.name}
                  </h3>
                </div>
                <p className="mt-4 text-sm/6 text-gray-600">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {tier.price}
                  </span>
                </p>
                <ul
                  role="list"
                  className="mt-8 space-y-3 text-sm/6 text-gray-600"
                >
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon
                        className="h-6 w-5 flex-none text-rose-600"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleCheckout(tier)}
                disabled={loadingTier === tier.id}
                aria-describedby={tier.id}
                className={cn(
                  "mt-8 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold text-rose-600 ring-1 ring-rose-200 ring-inset hover:ring-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                  loadingTier === tier.id && "cursor-wait opacity-50",
                )}
              >
                {loadingTier === tier.id
                  ? "Loading..."
                  : tier.id === "academic"
                    ? "Contact Us"
                    : "Buy dataset"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
