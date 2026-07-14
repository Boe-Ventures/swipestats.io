"use client";

import type { ComponentProps } from "react";
import Link from "next/link";

import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { NewsletterSignup } from "../_components/NewsletterSignup";
import { marketingButton } from "../_components/marketing-ui";

type TrackedLinkProps = ComponentProps<typeof Link> &
  (
    | {
        event: "upload";
        source: "hero_existing_export" | "final_cta";
      }
    | {
        event: "reminder";
        source: "hero";
      }
  );

export function TrackedDataRequestLink({
  event,
  source,
  onClick,
  ...props
}: TrackedLinkProps) {
  const { trackEvent } = useAnalytics();

  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        if (event === "upload") {
          trackEvent("data_request_upload_clicked", { source });
        } else {
          trackEvent("data_request_reminder_clicked", { source });
        }
        onClick?.(clickEvent);
      }}
    />
  );
}

export function DataRequestReminderSignup() {
  const { trackEvent } = useAnalytics();

  return (
    <div
      className="relative z-[2]"
      onSubmitCapture={() =>
        trackEvent("data_request_reminder_clicked", {
          source: "reminder_form",
        })
      }
    >
      <NewsletterSignup
        topic="newsletter-general"
        source="data_request_reminder"
        autoFetch={false}
        buttonLabel="Remind me"
        placeholder="you@email.com"
        formClassName="flex flex-col gap-2.5 sm:flex-row sm:items-center"
        groupClassName="flex flex-col gap-2 sm:flex-row sm:items-center"
        inputClassName="min-w-[220px] rounded-[10px] border border-white/[0.18] bg-white/[0.07] px-4 py-3 text-[14.5px] text-white placeholder:text-gray-500 focus:border-rose-600 focus:outline-none"
        buttonClassName={marketingButton({
          variant: "primary",
          size: "lg",
        })}
        successClassName="flex items-center gap-3 rounded-[10px] border border-white/15 bg-white/[0.07] px-4 py-3 text-[14.5px] font-semibold text-white"
        successLabel="You're on the list. We'll nudge you when it's time to upload."
      />
    </div>
  );
}
