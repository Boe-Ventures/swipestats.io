"use client";

import {
  isValidElement,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { InquiryKind } from "@/lib/inquiries";
import type { SponsorPlacement } from "@/lib/sponsorship";
import { useTRPC } from "@/trpc/react";

const SPONSORSHIP_EMAIL = "paw@swipestats.io";
const GENERAL_CONTACT_EMAIL = "kris@swipestats.io";

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-gray-800">
      <span className="flex items-center justify-between gap-3">
        {label}
        {optional && (
          <span className="text-xs font-normal text-gray-400">Optional</span>
        )}
      </span>
      {children}
    </label>
  );
}

function formValue(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function InquiryDialog({
  kind,
  placement,
  trigger,
  open,
  onOpenChange,
}: {
  kind: InquiryKind;
  placement?: SponsorPlacement;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const [internalOpen, setInternalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSponsorship = kind === "SPONSORSHIP";
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const emailSubject = isSponsorship
    ? "SwipeStats sponsorship inquiry"
    : "SwipeStats contact inquiry";
  const contactEmail = isSponsorship
    ? SPONSORSHIP_EMAIL
    : GENERAL_CONTACT_EMAIL;
  const emailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(emailSubject)}`;
  const mutation = useMutation(
    trpc.inquiry.submit.mutationOptions({
      onSuccess: () => setSubmitted(true),
      onError: (error) =>
        toast.error(error.message || "Could not send your inquiry"),
    }),
  );
  const handleOpenChange = (next: boolean) => {
    setDialogOpen(next);
    if (!next) {
      setSubmitted(false);
      mutation.reset();
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const company = formValue(data, "company");
    const website = formValue(data, "website");
    const budget = formValue(data, "budget");

    mutation.mutate({
      kind,
      name: formValue(data, "name"),
      email: formValue(data, "email"),
      company: company || undefined,
      website: website || undefined,
      message: formValue(data, "message"),
      budget: budget || undefined,
      sourcePath: pathname,
      placement,
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {isValidElement(trigger) ? (
        <DialogTrigger render={trigger} />
      ) : (
        trigger && <DialogTrigger>{trigger}</DialogTrigger>
      )}
      <DialogContent
        data-inquiry-dialog={kind.toLowerCase()}
        className="rounded-2xl border-gray-200 bg-white sm:max-w-lg"
        scrollable
      >
        {submitted ? (
          <div className="grid justify-items-center gap-4 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <DialogTitle>Thanks — we have it</DialogTitle>
              <DialogDescription className="mt-2 max-w-sm">
                We&apos;ll review your note and reply to the email you provided.
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <div className="font-mono text-[11px] font-medium tracking-[0.07em] text-rose-600 uppercase">
                {isSponsorship
                  ? "Partner with SwipeStats"
                  : "Contact SwipeStats"}
              </div>
              <DialogTitle className="text-2xl tracking-[-0.02em]">
                {isSponsorship
                  ? "Tell us about your campaign"
                  : "How can we help?"}
              </DialogTitle>
              <DialogDescription>
                {isSponsorship
                  ? "Share the essentials and we'll follow up with suitable placements and next steps."
                  : "Send a short note and we'll route it to the right person."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-6 sm:grid-cols-2">
              <Field label="Your name">
                <Input name="name" required minLength={2} autoComplete="name" />
              </Field>
              <Field label={isSponsorship ? "Work email" : "Email"}>
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field
                label={isSponsorship ? "Brand or company" : "Company"}
                optional={!isSponsorship}
              >
                <Input
                  name="company"
                  required={isSponsorship}
                  autoComplete="organization"
                />
              </Field>
              {isSponsorship && (
                <Field label="Website" optional>
                  <Input name="website" type="url" placeholder="https://" />
                </Field>
              )}
              {isSponsorship && (
                <div className="sm:col-span-2">
                  <Field label="Approximate campaign budget" optional>
                    <select
                      name="budget"
                      className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="">Not sure yet</option>
                      <option value="under-1000">Under $1,000</option>
                      <option value="1000-2500">$1,000–$2,500</option>
                      <option value="2500-5000">$2,500–$5,000</option>
                      <option value="5000-plus">$5,000+</option>
                    </select>
                  </Field>
                </div>
              )}
              <div className="sm:col-span-2">
                <Field
                  label={
                    isSponsorship
                      ? "What would you like to promote?"
                      : "Your message"
                  }
                >
                  <Textarea
                    name="message"
                    required
                    minLength={10}
                    rows={5}
                    placeholder={
                      isSponsorship
                        ? "Tell us about the product, audience, timing, and goal."
                        : "A little context helps us respond properly."
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-600">
              <Mail className="mr-2 inline size-4 text-gray-400" />
              Prefer email? Write directly to{" "}
              <a
                className="font-medium text-rose-600 underline underline-offset-2 hover:text-rose-700"
                href={emailHref}
              >
                {contactEmail}
              </a>
              .
            </div>

            <DialogFooter className="mt-2 px-0 pb-0">
              <p className="mr-auto self-center text-xs text-gray-500">
                We only use these details to respond to your inquiry.
              </p>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Send inquiry
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
