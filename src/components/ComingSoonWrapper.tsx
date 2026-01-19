"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Check, Lock } from "lucide-react";
import Link from "next/link";

import { useNewsletter } from "@/hooks/useNewsletter";
import type { TopicKey } from "@/server/clients/resend.client";
import { ConversionModal } from "@/app/app/dashboard/ConversionModal";

interface ComingSoonWrapperProps {
  featureName: string;
  description: string;
  topic: TopicKey;
  benefits?: string[];
  children: React.ReactNode;
}

export function ComingSoonWrapper({
  featureName,
  description,
  topic,
  benefits,
  children,
}: ComingSoonWrapperProps) {
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);

  const {
    isSubscribedToTopic,
    subscribe,
    userState,
    isLoading: isLoadingTopics,
    email: subscribedEmail,
  } = useNewsletter({ autoFetch: true });

  // Check if already subscribed (from API or localStorage)
  const isAlreadySubscribed = isSubscribedToTopic(topic);

  const form = useForm({
    defaultValues: {
      email: subscribedEmail || "", // Pre-fill with email from localStorage/API
    },
  });

  // Update form when subscribedEmail changes (after loading from localStorage/API)
  useEffect(() => {
    if (subscribedEmail && !form.getValues("email")) {
      form.setValue("email", subscribedEmail);
    }
  }, [subscribedEmail, form]);

  // Show conversion modal for anonymous users after successful subscription
  useEffect(() => {
    if (justSubscribed && userState === "anonymous") {
      // Small delay so they see the success message first
      const timer = setTimeout(() => {
        setShowConversionModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [justSubscribed, userState]);

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubscribing(true);
    setError(null);

    try {
      await subscribe({
        email: data.email,
        topic,
      });
      setJustSubscribed(true);
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to subscribe. Please try again.",
      );
    } finally {
      setIsSubscribing(false);
    }
  });

  return (
    <div className="relative isolate flex flex-col gap-10 overflow-hidden rounded-3xl bg-gray-900 px-6 py-24 shadow-2xl sm:px-24 md:h-96 xl:flex-row xl:items-center xl:py-32">
      <div className="max-w-2xl text-white xl:max-w-none xl:flex-auto">
        {/* Coming Soon Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
          <Lock className="h-4 w-4 text-rose-400" />
          <span className="text-sm font-semibold text-white">Coming Soon</span>
        </div>

        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {featureName}
        </h2>
        <p className="mt-4 text-lg text-gray-300">{description}</p>

        {/* Benefits list */}
        {benefits && benefits.length > 0 && (
          <ul className="mt-6 space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 text-gray-200">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Check className="h-4 w-4 text-rose-400" />
                </div>
                <span className="font-medium">{benefit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form or Success State */}
      {isLoadingTopics ? (
        <div className="mx-auto max-w-lg rounded-lg bg-white/5 p-8 text-white">
          <p className="text-center">Loading...</p>
        </div>
      ) : isAlreadySubscribed || justSubscribed ? (
        <div className="mx-auto max-w-lg rounded-lg bg-gradient-to-r from-rose-900 to-rose-500 p-8 text-white shadow-md">
          <h2 className="mb-4 text-2xl font-semibold">
            {isAlreadySubscribed && !justSubscribed
              ? "You're already subscribed! 🎉"
              : "Thank you for subscribing! 🙌"}
          </h2>
          <p className="text-md">
            {isAlreadySubscribed && !justSubscribed
              ? "We'll notify you when this feature is ready."
              : "You've successfully been added to our mailing list."}
            {subscribedEmail && (
              <>
                <br />
                <span className="mt-2 inline-block text-sm opacity-90">
                  ({subscribedEmail})
                </span>
              </>
            )}
          </p>
        </div>
      ) : (
        <form className="w-full max-w-md" onSubmit={onSubmit}>
          {userState === "real" ? (
            // Real users: Just a button (email from session)
            <button
              type="submit"
              disabled={isSubscribing}
              className="w-full rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubscribing ? "..." : "Notify me when ready"}
            </button>
          ) : (
            // Anonymous and logged-out: Show email field
            <div className="flex gap-x-4">
              <label htmlFor="coming-soon-email" className="sr-only">
                Email address
              </label>
              <input
                id="coming-soon-email"
                type="email"
                autoComplete="email"
                required={userState === "logged-out"}
                className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white shadow-sm ring-1 ring-white/10 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-white focus:ring-inset sm:text-sm sm:leading-6"
                placeholder="Enter your email"
                {...form.register("email", {
                  required: userState === "logged-out",
                })}
                disabled={isSubscribing}
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="flex-none rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubscribing ? "..." : "Notify me"}
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          <p className="mt-4 text-sm leading-6 text-gray-400">
            We care about your data. Read our{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-white hover:text-gray-200"
            >
              privacy&nbsp;policy
            </Link>
            .
          </p>
        </form>
      )}

      {/* Background decoration - rose gradient */}
      <svg
        viewBox="0 0 1024 1024"
        className="absolute top-1/2 left-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
        aria-hidden="true"
      >
        <circle
          cx="512"
          cy="512"
          r="512"
          fill="url(#comingSoonGradient)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient
            id="comingSoonGradient"
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

      {/* Children are not rendered - feature is hidden */}
      <div className="hidden">{children}</div>

      {/* Conversion modal for anonymous users */}
      <ConversionModal
        open={showConversionModal}
        onOpenChange={setShowConversionModal}
        initialEmail={subscribedEmail}
      />
    </div>
  );
}
