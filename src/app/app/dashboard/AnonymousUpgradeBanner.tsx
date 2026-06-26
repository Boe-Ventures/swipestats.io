"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { authClient } from "@/server/better-auth/client";
import { ConversionModal } from "./ConversionModal";

export function AnonymousUpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: session } = authClient.useSession();

  // Only show banner if user is anonymous
  if (dismissed || !session?.user?.isAnonymous) return null;

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-2.5 sm:px-3.5">
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="text-center text-[13px] leading-6 text-gray-700">
          <strong className="font-semibold">Create a free account</strong>
          <svg
            viewBox="0 0 2 2"
            aria-hidden="true"
            className="mx-2 inline size-0.5 fill-current"
          >
            <circle r={1} cx={1} cy={1} />
          </svg>
          Secure your data permanently and access from any device
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex-none rounded-md bg-gray-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Create account <span aria-hidden="true">&rarr;</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-4 p-2 focus-visible:-outline-offset-4"
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon aria-hidden="true" className="size-4 text-gray-500" />
        </button>
      </div>

      <ConversionModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
