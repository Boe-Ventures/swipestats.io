"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@heroicons/react/20/solid";

export function HingeEducationalContent() {
  const router = useRouter();

  const handleReady = () => {
    router.push("/upload/hinge");
  };

  return (
    <div className="space-y-4">
      {/* CTA */}
      <div className="flex justify-center">
        <Button size="lg" onClick={handleReady}>
          Ready to upload? Let&apos;s go
        </Button>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How it works
        </h2>

        <ol className="space-y-4">
          {/* Step 1 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600 sm:h-8 sm:w-8 sm:text-base">
              1
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Request your data from the Hinge app
              </p>
              <p className="text-xs text-gray-500">
                Go to Settings → Account → Download My Data. You&apos;ll receive
                it via email within 24-48 hours.
              </p>
            </div>
          </li>

          {/* Step 2 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600 sm:h-8 sm:w-8 sm:text-base">
              2
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Upload your file — we strip identifying info first
              </p>
              <p className="text-xs text-gray-500">
                Your name, email, and phone are removed in your browser before
                anything is sent to us
              </p>
            </div>
          </li>

          {/* Step 3 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600 sm:h-8 sm:w-8 sm:text-base">
              3
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Explore your insights
              </p>
              <p className="text-xs text-gray-500">
                See your activity patterns, match rates, and how you compare to
                others
              </p>
            </div>
          </li>
        </ol>

        {/* Privacy callout */}
        <div className="mt-4 flex items-start gap-2 rounded-md bg-purple-50 p-3">
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-purple-600" />
          <p className="text-xs text-purple-800">
            <strong>Privacy first:</strong> Direct identifiers (name, email,
            phone, username) are stripped in your browser before upload. Your
            profile is linked to a hashed anonymous ID — not your real identity.
            We&apos;re open source and actively maintain our anonymization as
            data formats evolve.{" "}
            <a
              href="https://github.com/Boe-Ventures/swipestats.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:no-underline"
            >
              See for yourself
            </a>
            .
          </p>
        </div>

        {/* Detailed instructions */}
        <details className="mt-4 border-t border-gray-200 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">
            Step-by-step instructions for the Hinge app
          </summary>
          <ol className="mt-2 ml-4 list-decimal space-y-1 text-xs text-gray-600">
            <li>Sign in to the Hinge app</li>
            <li>Tap your Photo Icon on the far right of the navigation bar</li>
            <li>Tap Account Settings</li>
            <li>Tap Download My Data</li>
            <li>Select your Country</li>
            <li>Tap Download My Data again</li>
            <li>Confirm your email address and tap Submit</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
