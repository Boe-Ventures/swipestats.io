"use client";

import { useState } from "react";
import { Shield, Check } from "lucide-react";
import { ConversionModal } from "@/app/app/dashboard/ConversionModal";

export function UpgradeAccountCTA() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        id="upgrade-account"
        className="relative isolate flex flex-col gap-10 overflow-hidden rounded-3xl bg-gray-900 px-6 py-24 shadow-2xl sm:px-24 md:h-96 xl:flex-row xl:items-center xl:py-32"
      >
        <div className="max-w-2xl text-white xl:max-w-none xl:flex-auto">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <Shield className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-semibold text-white">
              Temporary Account
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Don&apos;t lose your insights!
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Your data is currently stored temporarily. Create a free account to
            secure it permanently and unlock more features.
          </p>

          {/* Benefits list */}
          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-3 text-gray-200">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <Check className="h-4 w-4 text-rose-400" />
              </div>
              <span className="font-medium">Keep all your saved profiles</span>
            </li>
            <li className="flex items-center gap-3 text-gray-200">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <Check className="h-4 w-4 text-rose-400" />
              </div>
              <span className="font-medium">Access from any device</span>
            </li>
            <li className="flex items-center gap-3 text-gray-200">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <Check className="h-4 w-4 text-rose-400" />
              </div>
              <span className="font-medium">Unlock premium features</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="flex w-full max-w-md flex-col gap-4">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-white px-8 py-4 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Shield className="h-5 w-5" />
            Create Free Account
          </button>
          <p className="text-center text-sm text-gray-400">
            Takes less than 30 seconds • No credit card required
          </p>
        </div>

        {/* Background decoration */}
        <svg
          viewBox="0 0 1024 1024"
          className="absolute top-1/2 left-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
          aria-hidden="true"
        >
          <circle
            cx="512"
            cy="512"
            r="512"
            fill="url(#upgradeGradient)"
            fillOpacity="0.7"
          />
          <defs>
            <radialGradient
              id="upgradeGradient"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(512 512) rotate(90) scale(512)"
            >
              <stop stopColor="rgb(225, 29, 72)" />
              <stop offset="1" stopColor="rgb(225, 29, 72)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <ConversionModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
