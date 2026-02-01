import type { Metadata } from "next";

import ContactBooking from "./ContactBooking";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Schedule a call with our team to learn how SwipeStats can help you understand your dating data better.",
  openGraph: {
    title: "Contact Us | SwipeStats",
    description:
      "Schedule a call with our team to learn how SwipeStats can help you understand your dating data better.",
    images: [
      {
        url: "/images/og/swipestats_og.png",
        width: 1200,
        height: 630,
        alt: "SwipeStats - Analyze your Tinder data",
      },
    ],
    siteName: "SwipeStats",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | SwipeStats",
    description:
      "Schedule a call with our team to learn how SwipeStats can help you understand your dating data better.",
    images: ["/images/og/swipestats_og.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="relative isolate bg-white px-6 py-24 sm:py-32 lg:px-8">
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200"
      >
        <defs>
          <pattern
            x="50%"
            y={-64}
            id="83fd4e5a-9d52-42fc-97b6-718e5d7ee527"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M100 200V.5M.5 .5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-64} className="overflow-visible fill-gray-50">
          <path
            d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M299.5 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>

      {/* Background gradient blur */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#CF364C] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-xl lg:max-w-4xl">
        <h2 className="text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
          Let&apos;s talk about your dating data
        </h2>
        <p className="mt-2 text-lg/8 text-gray-600">
          Schedule a call with our team to learn how SwipeStats can help you
          gain insights from your dating app data, or discuss research
          opportunities.
        </p>
        <div className="mt-16 flex flex-col gap-16 sm:gap-y-20 lg:flex-row">
          {/* Cal.com booking embed */}
          <div className="lg:flex-auto">
            <ContactBooking />
          </div>

          {/* Sidebar content */}
          <div className="lg:mt-6 lg:w-80 lg:flex-none">
            <div className="flex size-12 items-center justify-center rounded-md bg-rose-600 text-white">
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <figure className="mt-10">
              <blockquote className="text-lg/8 font-semibold text-gray-900">
                <p>
                  &quot;SwipeStats helped me understand my dating patterns and
                  gave me valuable insights. The data visualizations are
                  incredible and the team was super helpful!&quot;
                </p>
              </blockquote>
              <figcaption className="mt-10 flex gap-x-6">
                <div className="size-12 flex-none rounded-full bg-gradient-to-br from-rose-400 to-rose-600" />
                <div>
                  <div className="text-base font-semibold text-gray-900">
                    Sarah M.
                  </div>
                  <div className="text-sm/6 text-gray-600">SwipeStats User</div>
                </div>
              </figcaption>
            </figure>

            {/* Additional contact info */}
            <div className="mt-10 border-t border-gray-200 pt-10">
              <h3 className="text-base font-semibold text-gray-900">
                Other ways to reach us
              </h3>
              <div className="mt-6 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-900">Email</dt>
                  <dd className="mt-1">
                    <a
                      href="mailto:kris@swipestats.io"
                      className="text-sm text-gray-600 transition-colors hover:text-rose-600"
                    >
                      kris@swipestats.io
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">
                    Response time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-600">
                    We typically respond within 24 hours during business days.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">
                    Research inquiries
                  </dt>
                  <dd className="mt-1 text-sm text-gray-600">
                    For academic research or data requests, please mention this
                    in your booking.
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
