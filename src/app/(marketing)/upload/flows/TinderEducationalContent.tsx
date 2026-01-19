"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@heroicons/react/20/solid";

export function TinderEducationalContent() {
  const router = useRouter();

  const handleReady = () => {
    router.push("/upload/tinder");
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600 sm:h-8 sm:w-8 sm:text-base">
              1
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Request your data from{" "}
                <a
                  href="https://account.gotinder.com/data"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 underline decoration-2 hover:no-underline"
                >
                  Tinder&apos;s website
                </a>
              </p>
              <p className="text-xs text-gray-500">
                It typically takes 24-48 hours to receive your data file by
                email
              </p>
            </div>
          </li>

          {/* Step 2 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600 sm:h-8 sm:w-8 sm:text-base">
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600 sm:h-8 sm:w-8 sm:text-base">
              3
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Explore your insights
              </p>
              <p className="text-xs text-gray-500">
                See your swipe patterns, match rates, and how you stack up
                against others
              </p>
            </div>
          </li>
        </ol>

        {/* Privacy callout */}
        <div className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 p-3">
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-xs text-rose-800">
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

        {/* Additional help */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500">
            <strong>Deleted your account?</strong> You can still request your
            data through{" "}
            <a
              href="https://www.help.tinder.com/hc/en-us/articles/115005626726-How-do-I-request-a-copy-of-my-personal-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 underline hover:no-underline"
            >
              Tinder&apos;s contact form
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
