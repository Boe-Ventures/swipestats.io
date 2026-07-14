"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import {
  CATALOG_CATEGORIES,
  CATALOG_CATEGORY_KEYS,
  CATALOG_CITIES,
  CATALOG_CITY_KEYS,
  CATALOG_REGION_KEYS,
  CATALOG_REGIONS,
  type CatalogCategoryKey,
  type CatalogLocationFilterKey,
} from "@/lib/catalog";
import { useTRPC } from "@/trpc/react";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-gray-800">
      {label}
      {children}
      {hint && (
        <span className="text-xs font-normal text-gray-500">{hint}</span>
      )}
    </label>
  );
}

function formValue(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function CatalogRequestDialog({
  category,
  targetEntryId,
  targetName,
  trigger,
}: {
  category: CatalogCategoryKey;
  targetEntryId?: string;
  targetName?: string;
  trigger?: ReactNode;
}) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation(
    trpc.catalog.requestHelp.mutationOptions({
      onSuccess: () => setSubmitted(true),
      onError: (error) =>
        toast.error(error.message || "Could not send request"),
    }),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const locationKey = formValue(data, "locationKey");
    mutation.mutate({
      category,
      targetEntryId,
      email: formValue(data, "email"),
      brief: formValue(data, "brief"),
      locationKey: locationKey
        ? (locationKey as CatalogLocationFilterKey)
        : undefined,
      remote: data.get("remote") === "on",
      timeline: formValue(data, "timeline") || undefined,
      budget: formValue(data, "budget") || undefined,
      broadcastConsent: data.get("broadcastConsent") === "on",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {trigger ?? <Button>Request help</Button>}
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-gray-200 bg-white sm:max-w-xl">
        {submitted ? (
          <div className="grid justify-items-center gap-4 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle>Request received</DialogTitle>
              <DialogDescription className="mt-2 max-w-sm">
                We&apos;ll review it before sharing anything with a provider.
                Your contact details stay private unless you choose otherwise.
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <div className="font-mono text-[11px] font-medium tracking-[0.07em] text-rose-600 uppercase">
                Dating services
              </div>
              <DialogTitle className="text-2xl tracking-[-0.02em]">
                {targetName
                  ? `Ask about ${targetName}`
                  : "Tell us what you need"}
              </DialogTitle>
              <DialogDescription>
                This creates a private request for a{" "}
                {CATALOG_CATEGORIES[category].shortLabel.toLowerCase()}. No
                SwipeStats account is required.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-6 sm:grid-cols-2">
              <Field label="Email">
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field label="Location">
                <select
                  name="locationKey"
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">No location preference</option>
                  <optgroup label="Launch cities">
                    {CATALOG_CITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CATALOG_CITIES[key].label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Regions">
                    {CATALOG_REGION_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CATALOG_REGIONS[key].label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <Field
                label="What would help?"
                hint="A sentence or two is enough."
              >
                <Textarea
                  name="brief"
                  required
                  minLength={10}
                  className="min-h-28 sm:col-span-2"
                  placeholder="I need stronger photos for Hinge and would prefer someone who can direct me on camera..."
                />
              </Field>
              <Field label="Timeline">
                <Input name="timeline" placeholder="This month" />
              </Field>
              <Field label="Budget (optional)">
                <Input name="budget" placeholder="$300–600" />
              </Field>
              <label className="flex items-start gap-2 text-sm text-gray-600 sm:col-span-2">
                <input
                  name="remote"
                  type="checkbox"
                  className="mt-1 accent-rose-600"
                />
                Remote providers are okay
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-600 sm:col-span-2">
                <input
                  name="broadcastConsent"
                  type="checkbox"
                  className="mt-1 accent-rose-600"
                />
                SwipeStats may later share an anonymized version with matching,
                verified providers. My contact details remain private.
              </label>
            </div>

            <DialogFooter className="border-t border-gray-100 px-0 pb-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Send private request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CatalogSubmissionDialog({ trigger }: { trigger?: ReactNode }) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation(
    trpc.catalog.submitListing.mutationOptions({
      onSuccess: () => setSubmitted(true),
      onError: (error) =>
        toast.error(error.message || "Could not submit listing"),
    }),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const locationKey = formValue(data, "locationKey");
    mutation.mutate({
      name: formValue(data, "name"),
      category: formValue(data, "category") as CatalogCategoryKey,
      email: formValue(data, "email"),
      website: formValue(data, "website") || undefined,
      description: formValue(data, "description"),
      locationKey: locationKey
        ? (locationKey as CatalogLocationFilterKey)
        : undefined,
      remote: data.get("remote") === "on",
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {trigger ?? <Button variant="outline">Submit a listing</Button>}
      </DialogTrigger>
      <DialogContent
        className="rounded-2xl border-gray-200 bg-white sm:max-w-xl"
        scrollable
      >
        {submitted ? (
          <div className="grid justify-items-center gap-4 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle>Listing submitted</DialogTitle>
              <DialogDescription className="mt-2 max-w-sm">
                We&apos;ll review the details before publishing anything and
                follow up at the email you provided.
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <div className="font-mono text-[11px] font-medium tracking-[0.07em] text-rose-600 uppercase">
                Provider intake
              </div>
              <DialogTitle className="text-2xl tracking-[-0.02em]">
                Submit a listing
              </DialogTitle>
              <DialogDescription>
                Tell us the essentials. SwipeStats editors review every
                submission before it enters the catalog.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-6 sm:grid-cols-2">
              <Field label="Business or product name">
                <Input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="organization"
                />
              </Field>
              <Field label="Category">
                <select
                  name="category"
                  required
                  defaultValue=""
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {CATALOG_CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {CATALOG_CATEGORIES[key].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contact email">
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field label="Website or booking link">
                <Input name="website" type="url" placeholder="https://" />
              </Field>
              <Field label="Primary location">
                <select
                  name="locationKey"
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                >
                  <option value="">Not location-specific</option>
                  <optgroup label="Launch cities">
                    {CATALOG_CITY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CATALOG_CITIES[key].label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Regions">
                    {CATALOG_REGION_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CATALOG_REGIONS[key].label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-600">
                <input
                  name="remote"
                  type="checkbox"
                  className="accent-rose-600"
                />
                Available remotely or online
              </label>
              <div className="sm:col-span-2">
                <Field
                  label="What should people know?"
                  hint="Services, audience, pricing approach, or why this belongs in SwipeStats."
                >
                  <Textarea
                    name="description"
                    required
                    minLength={20}
                    maxLength={3000}
                    className="min-h-28"
                  />
                </Field>
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 px-0 pb-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Send for review
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CatalogClaimDialog({
  entryId,
  entryName,
  trigger,
}: {
  entryId: string;
  entryName: string;
  trigger?: ReactNode;
}) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation(
    trpc.catalog.claim.mutationOptions({
      onSuccess: () => setSubmitted(true),
      onError: (error) =>
        toast.error(error.message || "Could not submit claim"),
    }),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      entryId,
      email: formValue(data, "email"),
      relationship: formValue(data, "relationship"),
      officialUrl: formValue(data, "officialUrl") || undefined,
      note: formValue(data, "note") || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {trigger ?? <Button variant="outline">Claim this listing</Button>}
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-gray-200 bg-white sm:max-w-lg">
        {submitted ? (
          <div className="grid justify-items-center gap-4 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <DialogTitle>Claim submitted</DialogTitle>
            <DialogDescription>
              We&apos;ll verify your relationship to {entryName} before enabling
              listing management.
            </DialogDescription>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Claim {entryName}</DialogTitle>
              <DialogDescription>
                Claiming lets an approved user manage provider-supplied listing
                details. SwipeStats keeps control of its editorial summary.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              <Field label="Work email">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Your relationship to this listing">
                <Input
                  name="relationship"
                  required
                  minLength={3}
                  placeholder="Owner, employee, authorized representative..."
                />
              </Field>
              <Field label="Official URL (optional)">
                <Input name="officialUrl" type="url" placeholder="https://" />
              </Field>
              <Field label="Anything else we should know?">
                <Textarea name="note" className="min-h-24" />
              </Field>
            </div>
            <DialogFooter className="border-t border-gray-100 px-0 pb-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit claim
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
