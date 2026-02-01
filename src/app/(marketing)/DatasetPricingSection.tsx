"use client";

import { CheckIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Small Sample",
    id: "small-sample",
    apiTier: "STARTER" as const,
    price: "$15",
    description: "Get started",
    features: ["10 profiles", "Perfect to test and learn about the data model"],
    mostPopular: false,
  },
  {
    name: "Full package",
    id: "full-package",
    apiTier: "STANDARD" as const,
    price: "$50",
    description: "Scale your analysis and get access to future datasets",
    features: [
      "1,000 anonymous profiles",
      "Access to future datasets",
      "Analyze at scale",
      "Direct support",
    ],
    mostPopular: true,
  },
  {
    name: "University / Enterprise",
    id: "tier-enterprise",
    apiTier: null,
    price: "$1500",
    description: "Dedicated support and infrastructure for your company.",
    features: [
      "Licence to distribute datasets to students",
      "4k+ profiles",
      "Direct support",
    ],
    mostPopular: false,
  },
];

export function DatasetPricingSection() {
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
    if (tier.id === "tier-enterprise") {
      window.location.href =
        "mailto:kris@swipestats.io?subject=Academic%20License%20Inquiry";
      return;
    }

    if (!tier.apiTier) return;

    setLoadingTier(tier.id);
    createCheckout.mutate({ tier: tier.apiTier });
  };

  return (
    <div id="pricing" className="py-24 sm:pt-48">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base leading-7 font-semibold text-rose-600">
            Pricing
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Get your own dataset
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Whether it&apos;s for a blog, a research paper, or plain curiosity, a
          dataset from SwipeStats will get you on the right track.
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier, tierIdx) => (
            <div
              key={tier.id}
              className={cn(
                tier.mostPopular ? "lg:z-10 lg:rounded-b-none" : "lg:mt-8",
                tierIdx === 0 ? "lg:rounded-r-none" : "",
                tierIdx === tiers.length - 1 ? "lg:rounded-l-none" : "",
                "flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10",
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={cn(
                      tier.mostPopular ? "text-rose-600" : "text-gray-900",
                      "text-lg leading-8 font-semibold",
                    )}
                  >
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-rose-600/10 px-2.5 py-1 text-xs leading-5 font-semibold text-rose-600">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {tier.price}
                  </span>
                </p>
                <ul
                  role="list"
                  className="mt-8 space-y-3 text-sm leading-6 text-gray-600"
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
                  "mt-8 block rounded-md px-3 py-2 text-center text-sm leading-6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                  loadingTier === tier.id && "cursor-wait opacity-50",
                )}
              >
                {loadingTier === tier.id
                  ? "Loading..."
                  : tier.id === "tier-enterprise"
                    ? "Contact Us"
                    : "Buy dataset"}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start gap-x-8 gap-y-6 rounded-3xl p-8 ring-1 ring-gray-900/10 sm:gap-y-10 sm:p-10 lg:col-span-2 lg:flex-row lg:items-center">
          <div className="lg:min-w-0 lg:flex-1">
            <h3 className="text-lg leading-8 font-semibold tracking-tight text-rose-600">
              Curious about the data model?
            </h3>
            <p className="mt-1 text-base leading-7 text-gray-600">
              Download one demo profile for free, or explore the documentation
            </p>
          </div>
          <Link
            prefetch={false}
            href="/downloads/swipestats-demo-profile.json.zip"
            target="_blank"
          >
            <Button variant={"ghost"}>Donwnload demo profile</Button>
          </Link>
          <a
            href="https://github.com/Boe-Ventures/swipestats.io"
            target="_blank"
            className="rounded-md px-3.5 py-2 text-sm leading-6 font-semibold text-rose-600 ring-1 ring-rose-200 ring-inset hover:ring-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            rel="noreferrer"
          >
            Explore the code <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
