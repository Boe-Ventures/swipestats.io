"use client";

import { Check } from "lucide-react";
import { marketingButton } from "@/app/(marketing)/_components/marketing-ui";
import { NewsletterSignup } from "@/app/(marketing)/_components/NewsletterSignup";

interface NewsletterCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  features?: Array<{
    label: string;
    description?: string;
  }>;
}

export function NewsletterCard({
  title = "Get data-backed dating tips weekly",
  description = "No spam. Just stats, tips, and the occasional hot take.",
  buttonText = "Subscribe",
}: NewsletterCardProps) {
  return (
    <section className="not-prose dark:border-border dark:bg-card relative my-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:rounded-3xl">
      <div className="p-6 sm:p-8">
        <h2 className="dark:text-foreground text-[1.75rem] leading-[110%] font-bold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>

        <p className="dark:text-muted-foreground mt-2.5 text-lg leading-[160%] text-gray-600">
          {description}
        </p>

        <NewsletterSignup
          topic="newsletter-general"
          source="blog_newsletter_card"
          buttonLabel={buttonText}
          realButtonLabel={buttonText}
          loadingLabel="…"
          placeholder="email@example.com"
          formClassName="mt-5"
          groupClassName="flex flex-col gap-3 sm:flex-row"
          inputClassName="flex-1 rounded-[10px] border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-rose-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
          buttonClassName={marketingButton({ variant: "primary", size: "lg" })}
          realButtonClassName={marketingButton({
            variant: "primary",
            size: "lg",
          })}
          errorClassName="mt-2 text-sm text-rose-600 dark:text-rose-400"
          renderSuccess={({ alreadySubscribed, email }) => (
            <div className="mt-5 flex items-center gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                <Check
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  strokeWidth={2.5}
                />
              </div>
              <div>
                <p className="dark:text-foreground text-lg font-semibold text-gray-900">
                  {alreadySubscribed
                    ? "You're already subscribed!"
                    : "You're in!"}
                </p>
                {email && (
                  <p className="dark:text-muted-foreground text-sm text-gray-500">
                    ({email})
                  </p>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </section>
  );
}
