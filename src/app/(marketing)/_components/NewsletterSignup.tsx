"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import type { NewsletterSource, TopicKey } from "@/lib/validators";
import { useNewsletter } from "@/hooks/useNewsletter";

/**
 * Shared newsletter / reminder email-capture form.
 *
 * One source of truth for the subscribe flow (useNewsletter wiring, the
 * real-user-vs-anonymous branching, loading/error/already-subscribed states),
 * with all presentation passed in via className/label props so each surface
 * keeps its own look — the home page's dark block and the data-request page's
 * inline reminder band both render this.
 */

type SuccessState = { alreadySubscribed: boolean; email?: string };

export type NewsletterSignupProps = {
  topic: TopicKey;
  source: NewsletterSource;
  /** Fetch existing subscriptions to detect already-subscribed users. */
  autoFetch?: boolean;

  // presentation
  formClassName?: string;
  groupClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  /** Button class for logged-in "real" users (button-only, no email field). */
  realButtonClassName?: string;
  errorClassName?: string;
  /** Rendered under the form (e.g. a privacy line). */
  footer?: React.ReactNode;

  // copy
  buttonLabel?: string;
  realButtonLabel?: string;
  loadingLabel?: string;
  placeholder?: string;

  // success
  successClassName?: string;
  successLabel?: React.ReactNode;
  /** Full custom success render (overrides the default inline success). */
  renderSuccess?: (state: SuccessState) => React.ReactNode;
};

export function NewsletterSignup({
  topic,
  source,
  autoFetch = true,
  formClassName,
  groupClassName = "flex gap-x-4",
  inputClassName,
  buttonClassName,
  realButtonClassName,
  errorClassName = "mt-3 text-sm text-rose-300",
  footer,
  buttonLabel = "Notify me",
  realButtonLabel,
  loadingLabel = "…",
  placeholder = "Enter your email",
  successClassName,
  successLabel = "You're subscribed 🎉",
  renderSuccess,
}: NewsletterSignupProps) {
  const {
    subscribe,
    userState,
    isSubscribedToTopic,
    email: subscribedEmail,
    isLoading,
  } = useNewsletter({ autoFetch });

  const [email, setEmail] = useState("");
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from a known email once it resolves (returning/anonymous users).
  useEffect(() => {
    if (subscribedEmail && !email) setEmail(subscribedEmail);
  }, [subscribedEmail, email]);

  const isRealUser = userState === "real";
  const alreadySubscribed = !isLoading && isSubscribedToTopic(topic);
  const showSuccess = justSubscribed || alreadySubscribed;

  if (showSuccess) {
    const state: SuccessState = {
      alreadySubscribed: alreadySubscribed && !justSubscribed,
      email: subscribedEmail,
    };
    if (renderSuccess) return <>{renderSuccess(state)}</>;
    return (
      <div className={successClassName}>
        <CheckCircleIcon className="h-5 w-5 flex-none text-rose-400" />
        {successLabel}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await subscribe({
        email: isRealUser ? undefined : email,
        topic,
        source,
      });
      setJustSubscribed(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <div className={groupClassName}>
        {!isRealUser && (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            aria-label="Email address"
            autoComplete="email"
            disabled={submitting}
            className={inputClassName}
          />
        )}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            isRealUser ? (realButtonClassName ?? buttonClassName) : buttonClassName,
            submitting && "cursor-wait opacity-60",
          )}
        >
          {submitting
            ? loadingLabel
            : isRealUser
              ? (realButtonLabel ?? buttonLabel)
              : buttonLabel}
        </button>
      </div>
      {footer}
      {error && <p className={errorClassName}>{error}</p>}
    </form>
  );
}
