"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useNewsletter } from "@/hooks/useNewsletter";

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
    autoFetch: true,
  });

  const wasAlreadySubscribed = isSubscribedToTopic("newsletter-general");

  const [wasSubscribedOnMount, setWasSubscribedOnMount] = useState(false);

  useEffect(() => {
    if (!isLoading && wasAlreadySubscribed && !justSubscribed) {
      setWasSubscribedOnMount(true);
    }
  }, [isLoading, wasAlreadySubscribed, justSubscribed]);

  const form = useForm({
    defaultValues: {
      email: subscribedEmail || "",
    },
  });

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

  if (wasSubscribedOnMount || justSubscribed) {
    return (
      <section className="not-prose my-8 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {wasSubscribedOnMount && !justSubscribed
                ? "You're already subscribed!"
                : "You're in!"}
            </p>
            {subscribedEmail && (
              <p className="text-sm text-gray-500">({subscribedEmail})</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="not-prose relative my-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
      <div className="relative z-10 p-6 sm:p-8">
        <h2 className="text-[1.75rem] leading-[110%] font-bold tracking-tight text-gray-900">
          {title}
        </h2>

        {/* Description */}
        <p className="mt-2.5 text-lg leading-[160%] text-gray-700">
          {description}
        </p>

        {/* Email form */}
        <form onSubmit={onSubmit} className="mt-5">
          {userState === "real" ? (
            <Button
              type="submit"
              disabled={isSubscribing}
              loading={isSubscribing}
              size="lg"
            >
              {buttonText}
            </Button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder={
                  userState === "anonymous"
                    ? "Enter your email (optional)"
                    : "email@example.com"
                }
                required={userState === "logged-out"}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex-1 rounded-md border px-3 py-2.5 text-sm shadow-xs transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                {...form.register("email", {
                  required: userState === "logged-out",
                })}
                disabled={isSubscribing}
              />
              <Button
                type="submit"
                disabled={isSubscribing}
                loading={isSubscribing}
                size="lg"
                className="flex-none"
              >
                {buttonText}
              </Button>
            </div>
          )}
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
        </form>
      </div>

      {/* Gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 z-0 translate-x-[40%] translate-y-[43%] rotate-12 select-none"
      >
        <div className="size-[38rem] rounded-full bg-linear-to-br from-[#ff4694] to-[#E11D48] opacity-20 blur-3xl" />
      </div>
    </section>
  );
}
