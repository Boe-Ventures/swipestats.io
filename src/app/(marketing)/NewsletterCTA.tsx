"use client";

/*
Newsletter flow
1. User enters email, checks or uncheks 3 day reminder, and clicks notify me
2. User is shown a success message, or that they are already subscribed
3. User is sent an email with a link to confirm their subscription
4. User clicks the link and is shown a success message
5. Regardless the user receives the 3 day notification email if they checked the box
6. In any other email they receive they can unsubscribe
7. The unsusubscribe link takes them to a page where they can manage their notifications, email is unsubbed on load
*/

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useNewsletter } from "@/hooks/useNewsletter";

export default function NewsletterCTA() {
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isSubscribedToTopic,
    subscribe: subscribeToNewsletter,
    userState,
    email: subscribedEmail,
    isLoading,
  } = useNewsletter({
    autoFetch: true, // Fetch on marketing pages to check real user subscriptions
  });

  // Check if already subscribed (from API or localStorage)
  const wasAlreadySubscribed = isSubscribedToTopic("newsletter-general");

  // Track if they were subscribed on initial mount (not from this session)
  const [wasSubscribedOnMount, setWasSubscribedOnMount] = useState(false);

  useEffect(() => {
    // Only set wasSubscribedOnMount after loading is complete
    if (!isLoading && wasAlreadySubscribed && !justSubscribed) {
      setWasSubscribedOnMount(true);
    }
  }, [isLoading, wasAlreadySubscribed, justSubscribed]);

  const schema = useMemo(
    () =>
      z.object({
        email:
          userState === "real"
            ? z.string()
            : z.string().email("Please enter a valid email address"),
      }),
    [userState],
  );

  const form = useForm({
    resolver: zodResolver(schema),
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

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubscribing(true);
    setError(null);

    try {
      await subscribeToNewsletter({
        email: data.email,
        topic: "newsletter-general",
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
    <div
      id="newsletter"
      className="relative isolate flex flex-col gap-10 overflow-hidden rounded-3xl bg-gray-900 px-6 py-24 shadow-2xl sm:px-24 md:h-96 xl:flex-row xl:items-center xl:py-32"
    >
      <div className="max-w-2xl text-white xl:max-w-none xl:flex-auto">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Afraid you&apos;ll forget about SwipeStats?
        </h2>
        <p className="mt-2">
          Sign up to our newsletter and we&apos;ll send you a reminder in 3
          days, along with other useful dating tips and news
        </p>
      </div>
      {wasSubscribedOnMount || justSubscribed ? (
        <div className="thank-you-card mx-auto mt-10 max-w-lg rounded-lg bg-linear-to-r from-rose-900 to-rose-500 p-8 text-white shadow-md">
          <h2 className="mb-4 text-2xl font-semibold">
            {wasSubscribedOnMount && !justSubscribed
              ? "You're already subscribed! 🎉"
              : "Thank you for subscribing! 🙌"}
          </h2>
          <p className="text-md">
            You&apos;ve successfully been added to our mailing list.
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
              {isSubscribing ? "..." : "Subscribe to Newsletter"}
            </button>
          ) : (
            // Anonymous and logged-out: Show email field
            <div className="flex gap-x-4">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white shadow-sm ring-1 ring-white/10 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-white focus:ring-inset sm:text-sm sm:leading-6"
                placeholder="Enter your email"
                {...form.register("email")}
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

          {(error || form.formState.errors.email) && (
            <p className="mt-3 text-sm text-rose-300">
              {error || form.formState.errors.email?.message}
            </p>
          )}

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

      {/* <svg
            viewBox="0 0 1024 1024"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
            aria-hidden="true"
          >
            <circle
              cx={512}
              cy={512}
              r={512}
              fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
              fillOpacity="0.7"
            />
            <defs>
              <radialGradient
                id="759c1415-0410-454c-8f7c-9a820de03641"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(512 512) rotate(90) scale(512)"
              >
                <stop stopColor="#7775D6" />
                <stop offset={1} stopColor="#E935C1" stopOpacity={0} />
              </radialGradient>
            </defs>
          </svg> */}
      <svg
        viewBox="0 0 1024 1024"
        className="absolute top-1/2 left-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
        aria-hidden="true"
      >
        <circle
          cx="512"
          cy="512"
          r="512"
          fill="url(#newGradient)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient
            id="newGradient"
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
  );
}
