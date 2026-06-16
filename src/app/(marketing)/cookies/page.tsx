import type { Metadata } from "next";

import { CookiePreferences } from "./CookiePreferences";

export const metadata: Metadata = {
  title: "Cookie Preferences — SwipeStats",
  description: "Manage your cookie and tracking preferences on SwipeStats.",
};

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-gray-900">Cookie preferences</h1>
      <p className="mt-2 text-gray-600">
        SwipeStats is privacy-first. Nothing non-essential runs until you turn it
        on, and you can change these choices any time. See our{" "}
        <a
          href="/privacy"
          className="text-primary underline underline-offset-4 hover:no-underline"
        >
          privacy policy
        </a>{" "}
        for details.
      </p>
      <div className="mt-8">
        <CookiePreferences />
      </div>
    </div>
  );
}
