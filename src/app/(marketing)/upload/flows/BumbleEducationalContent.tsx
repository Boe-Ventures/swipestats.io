"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useNewsletter } from "@/hooks/useNewsletter";

export function BumbleEducationalContent() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    subscribe,
    isSubscribedToTopic,
    email: subscribedEmail,
    userState,
  } = useNewsletter({ autoFetch: true });

  // Check if already subscribed
  const isAlreadySubscribed = isSubscribedToTopic("waitlist-bumble");

  // Pre-fill email from session/localStorage
  useEffect(() => {
    if (subscribedEmail && !email) {
      setEmail(subscribedEmail);
    }
  }, [subscribedEmail, email]);

  // Show success if already subscribed
  useEffect(() => {
    if (isAlreadySubscribed) {
      setIsSubmitted(true);
    }
  }, [isAlreadySubscribed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await subscribe({
        email,
        topic: "waitlist-bumble",
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to subscribe. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Bumble Waitlist Card */}
      <div className="rounded-2xl bg-yellow-500 px-5 py-8 sm:rounded-3xl sm:px-10 sm:py-12 lg:flex lg:items-center lg:p-16">
        <div className="lg:w-0 lg:flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Bumble is coming soon
          </h2>
          <p className="mt-3 max-w-3xl text-base text-gray-800 sm:text-lg">
            We&apos;re working on it! Leave your email to get notified when
            Bumble support is ready.
          </p>
        </div>
        <div className="mt-8 sm:w-full sm:max-w-md lg:mt-0 lg:ml-8 lg:flex-1">
          {isSubmitted ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <CheckCircleIcon
                    className="h-5 w-5 text-green-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Thanks, we&apos;ll let you know! 🎉
                  </p>
                  {email && (
                    <p className="mt-1 text-xs text-green-700">({email})</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={handleSubmit}
            >
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <Input
                id="email-address"
                name="email-address"
                type="email"
                autoComplete="email"
                required={userState === "logged-out"}
                placeholder={
                  userState === "anonymous"
                    ? "Enter your email (optional)"
                    : "Enter your email"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border-gray-900/20 bg-white"
              />
              <Button
                type="submit"
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                Notify me
              </Button>
            </form>
          )}

          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <p className="mt-3 text-sm text-gray-700">
            We care about your data. Read our{" "}
            <Link
              href="/privacy"
              className="font-medium text-gray-900 underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How it will work
        </h2>

        <ol className="space-y-4">
          {/* Step 1 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700 sm:h-8 sm:w-8 sm:text-base">
              1
            </span>
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">
                Request your data from{" "}
                <a
                  href="https://support.bumble.com/hc/en-us/requests/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-600 underline decoration-2 hover:no-underline"
                >
                  Bumble&apos;s contact form
                </a>
              </p>
              <p className="text-xs text-gray-500">
                Select &quot;Request my data&quot; — processing can take up to
                30 days
              </p>
            </div>
          </li>

          {/* Step 2 */}
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700 sm:h-8 sm:w-8 sm:text-base">
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700 sm:h-8 sm:w-8 sm:text-base">
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
        <div className="mt-4 flex items-start gap-2 rounded-md bg-yellow-50 p-3">
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-yellow-600" />
          <p className="text-xs text-yellow-800">
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
            <strong>Note:</strong> If your Bumble profile has been deleted for
            more than 28 days, data retrieval may not be possible.
          </p>
        </div>
      </div>
    </div>
  );
}
