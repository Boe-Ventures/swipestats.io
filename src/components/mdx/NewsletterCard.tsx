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
  title = "Stay in the loop with dating insights",
  description = "Get the latest dating tips, stats, and insights delivered to your inbox. No spam, just valuable content.",
  buttonText = "Subscribe",
  features,
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

  const defaultFeatures = [
    {
      label: "Dating tips & tricks",
      description: "Improve your profile and conversation game",
    },
    {
      label: "Latest statistics",
      description: "Stay updated with dating trends and insights",
    },
    {
      label: "Exclusive content",
      description: "Get access to premium guides and resources",
    },
  ];

  const displayFeatures = features || defaultFeatures;

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
      <section className="not-prose relative my-8 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg">
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {wasSubscribedOnMount && !justSubscribed
                  ? "You're already subscribed! 🎉"
                  : "Thank you for subscribing! 🎉"}
              </h3>
              <p className="mt-2 text-gray-700">
                You've successfully been added to our mailing list. Keep an eye
                on your inbox for great content!
                {subscribedEmail && (
                  <>
                    <br />
                    <span className="mt-2 inline-block text-sm opacity-75">
                      ({subscribedEmail})
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="not-prose relative my-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Title with icon */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-[1.75rem] leading-[110%] font-bold tracking-tight text-gray-900">
              {title}
            </h2>
          </div>
        </div>

        {/* Description */}
        <div className="mt-3 text-lg leading-[160%] text-gray-700">
          <p>{description}</p>
        </div>

        {/* Features list */}
        <ul className="mt-5 space-y-2.5">
          {displayFeatures.map((feature, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span className="mt-0.5 block flex-none">
                <Check className="size-5 text-emerald-600" strokeWidth={2.5} />
              </span>
              <span className="block flex-1 text-[15px] leading-relaxed">
                <span className="font-semibold text-gray-900">
                  {feature.label}
                  {feature.description && ": "}
                </span>
                {feature.description && (
                  <span className="text-gray-700">{feature.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* Email form */}
        <form onSubmit={onSubmit} className="mt-6">
          {userState === "real" ? (
            // Real users: Just a button (email from session)
            <Button
              type="submit"
              disabled={isSubscribing}
              loading={isSubscribing}
              size="lg"
              className="w-full"
            >
              {buttonText}
            </Button>
          ) : (
            // Anonymous and logged-out: Show email field
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder={
                  userState === "anonymous"
                    ? "Enter your email (optional)"
                    : "Enter your email"
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

      {/* Gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transform-gpu overflow-hidden blur-3xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="absolute right-0 bottom-0 aspect-[1155/678] w-[36.125rem] translate-x-[20%] translate-y-[30%] rotate-12 bg-gradient-to-tr from-[#ff80b5] to-[#CF364C] opacity-20 sm:w-[48rem]"
        />
      </div>
    </section>
  );
}
