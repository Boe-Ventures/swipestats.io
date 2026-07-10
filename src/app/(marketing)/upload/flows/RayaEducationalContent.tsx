"use client";

import { ShieldCheckIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function RayaEducationalContent() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button size="lg" onClick={() => router.push("/upload/raya")}>
          Ready to upload? Let&apos;s go
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How it works
        </h2>
        <ol className="space-y-4">
          {[
            [
              "Request your data from Raya",
              "Download the ZIP archive Raya provides when your request is ready.",
            ],
            [
              "Upload the ZIP archive",
              "Your name, email, message text, contacts, usernames, and coordinates are removed in your browser.",
            ],
            [
              "Explore your Raya activity",
              "See likes, passes, matched outcomes, sent messages, and how your activity changes over time.",
            ],
          ].map(([title, description], index) => (
            <li key={title} className="flex gap-3 sm:gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white sm:h-8 sm:w-8 sm:text-base">
                {index + 1}
              </span>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-start gap-2 rounded-md bg-gray-100 p-3">
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-gray-900" />
          <p className="text-xs text-gray-700">
            <strong>Format-aware privacy:</strong> Raya does not include
            conversation IDs or received messages in this export. SwipeStats
            keeps only daily sent-message counts and never uploads message
            bodies or counterpart identifiers.
          </p>
        </div>
      </div>
    </div>
  );
}
