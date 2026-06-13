"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { useNewsletter } from "@/hooks/useNewsletter";
import { btnBase, btnPrimary, btnLg } from "./_ui";

export function ReminderForm() {
  const { subscribe, userState } = useNewsletter({ autoFetch: false });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      await subscribe({
        email: userState === "real" ? undefined : email,
        topic: "newsletter-general",
      });
      setStatus("done");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  if (status === "done") {
    return (
      <div className="relative z-[2] flex items-center gap-3 rounded-[10px] border border-white/15 bg-white/[0.07] px-4 py-3 text-[14.5px] font-semibold text-white">
        <CheckCircleIcon className="h-5 w-5 flex-none text-rose-400" />
        You&apos;re on the list — we&apos;ll nudge you when it&apos;s time to
        upload.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-[2] flex flex-col gap-2.5 max-[460px]:flex-col sm:flex-row"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {userState !== "real" && (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            disabled={status === "loading"}
            className="min-w-[220px] rounded-[10px] border border-white/[0.18] bg-white/[0.07] px-4 py-3 text-[14.5px] text-white placeholder:text-gray-500 focus:border-rose-600 focus:outline-none"
          />
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            btnBase,
            btnPrimary,
            btnLg,
            status === "loading" && "cursor-wait opacity-60",
          )}
        >
          {status === "loading" ? "…" : "Remind me"}
        </button>
      </div>
      {error && (
        <p className="absolute -bottom-6 left-0 text-[13px] text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
