"use client";

/*
Newsletter flow
1. User enters email and clicks notify me
2. User is shown a success message, or that they are already subscribed
3. User is sent an email with a link to confirm their subscription
4. User clicks the link and is shown a success message
5. In any other email they receive they can unsubscribe
6. The unsubscribe link takes them to a page where they can manage their notifications

The subscribe flow itself lives in the shared <NewsletterSignup /> component so
the home block and the /how-to-request-your-data reminder band stay in sync.
*/

import Link from "next/link";

import { NewsletterSignup } from "./_components/NewsletterSignup";

const buttonClass =
  "rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";

export default function NewsletterCTA() {
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

      <NewsletterSignup
        topic="newsletter-general"
        formClassName="w-full max-w-md"
        groupClassName="flex gap-x-4"
        inputClassName="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white shadow-sm ring-1 ring-white/10 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-white focus:ring-inset sm:text-sm sm:leading-6"
        buttonClassName={`flex-none ${buttonClass}`}
        realButtonClassName={`w-full ${buttonClass}`}
        buttonLabel="Notify me"
        realButtonLabel="Subscribe to Newsletter"
        loadingLabel="..."
        footer={
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
        }
        renderSuccess={({ alreadySubscribed, email }) => (
          <div className="thank-you-card mx-auto mt-10 max-w-lg rounded-lg bg-linear-to-r from-rose-900 to-rose-500 p-8 text-white shadow-md">
            <h2 className="mb-4 text-2xl font-semibold">
              {alreadySubscribed
                ? "You're already subscribed! 🎉"
                : "Thank you for subscribing! 🙌"}
            </h2>
            <p className="text-md">
              You&apos;ve successfully been added to our mailing list.
              {email && (
                <>
                  <br />
                  <span className="mt-2 inline-block text-sm opacity-90">
                    ({email})
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      />

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
