"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { btnBase, btnGhost, btnLg } from "./_ui";

/* ----------------------------------------------------------- brand icons */

function TinderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -0.06 35 40.3" fill="currentColor" className={className}>
      <path d="M10.5 16.25c-.06 0-.1 0-.14-.04-1.36-1.8-1.7-4.9-1.78-6.08-.02-.23-.28-.35-.48-.24C3.9 12.24 0 17.82 0 23.2c0 9.27 6.43 17.04 17.5 17.04 10.37 0 17.5-8 17.5-17.03C35 11.4 26.57 3.58 19.06.04c-.2-.1-.42.07-.4.28.98 6.37-.36 13.28-8.17 15.95z" />
    </svg>
  );
}
function HingeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-300.4 530 263.8 243.5"
      fill="currentColor"
      className={className}
    >
      <path d="M-36.6,620.1c-17.4,37.4-46.6,47.7-79.5,47.7h-2.9v105.7h-41.4V667.8h-50.6c-31.4,0-47.5,10.6-47.9,44.7v61h-41.5V530h41.4 v112.3c13.8-10.4,32.5-16.6,56.6-16.6h41.9V530h41.4v95.7c20.7,0,37-0.4,49.5-20.4L-36.6,620.1z" />
    </svg>
  );
}
function BumbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 2500 2500" fill="currentColor" className={className}>
      <path d="m2278.8 1314-458 791c-19.5 33.7-55.7 56.2-97.7 56.2h-915.5c-42 0-78.1-22.5-97.7-56.6l-458.9-790.6c-20.2-34.9-20.2-77.9 0-112.8l458-791c19.5-33.2 56.2-56.2 97.7-56.2h917c42 0 78.1 22.9 97.7 56.6l457.5 790.5c20.2 34.9 20.2 78-.1 112.9zm-1153.8 447.2h280.8c62.3 0 112.8-50.5 112.8-112.8s-50.5-112.8-112.8-112.8h-280.8c-62.3 0-112.8 50.5-112.8 112.8s50.5 112.8 112.8 112.8zm392.1-1004.4h-503.4c-62.4 0-113 50.6-113 113s50.6 113 113 113h503.4c62.4 0 113-50.6 113-113s-50.6-113-113-113zm204.6 389.2h-913.1c-62.4 0-113 50.6-113 113s50.6 113 113 113h913.1c62.4 0 113-50.6 113-113s-50.6-113-113-113z" />
    </svg>
  );
}

/* ----------------------------------------------------------- data */

const TINDER = "oklch(0.63 0.21 18)";
const TINDER_GRAD =
  "linear-gradient(135deg, oklch(0.68 0.18 35), oklch(0.63 0.21 18))";
const HINGE = "oklch(0.5 0.18 295)";
const BUMBLE = "oklch(0.78 0.16 85)";
const BUMBLE_INK = "#6b4e00";

const UPLOAD_HREF = "/upload";

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[5px] border border-gray-200 bg-gray-100 px-1.5 py-px font-mono text-[12.5px] whitespace-nowrap text-gray-800">
      {children}
    </code>
  );
}

type Chip = {
  label: string;
  icon: typeof CheckIcon;
  variant?: "good" | "warn";
};

type Step = { title: string; desc: React.ReactNode };

type Provider = {
  id: "tinder" | "hinge" | "bumble";
  name: string;
  tabMeta: string;
  icon: ({ className }: { className?: string }) => React.JSX.Element;
  iconStyle: React.CSSProperties;
  iconColor: string;
  tabActiveBg: string;
  accent: string;
  numberInk: string;
  sub: React.ReactNode;
  chips: Chip[];
  steps: Step[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  note?: React.ReactNode;
  phone: { app: string; cta: string; cap: string; rows: number; hl: number };
};

const providers: Provider[] = [
  {
    id: "tinder",
    name: "Tinder",
    tabMeta: "EASIEST · 24–48h",
    icon: TinderIcon,
    iconStyle: { background: TINDER_GRAD },
    iconColor: "#fff",
    tabActiveBg: "oklch(0.97 0.03 25)",
    accent: TINDER,
    numberInk: "#fff",
    sub: (
      <>
        The easiest export. You&apos;ll get a{" "}
        <InlineCode>tinder.json</InlineCode> file.
      </>
    ),
    chips: [
      { label: "Beginner friendly", icon: CheckIcon, variant: "good" },
      { label: "Arrives in 24–48 hours", icon: ClockIcon },
      { label: "Delivered by email", icon: EnvelopeIcon },
    ],
    steps: [
      {
        title: "Go to Tinder's data download page",
        desc: (
          <>
            Open{" "}
            <a
              href="https://account.gotinder.com/data"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: TINDER }}
            >
              account.gotinder.com/data
            </a>{" "}
            and sign in with the same method you use for Tinder (phone, Google,
            Facebook, or Apple).
          </>
        ),
      },
      {
        title: "Confirm your account and submit the request",
        desc: "Verify your identity if prompted, then request your personal data. Tinder begins compiling your full export.",
      },
      {
        title: "Wait for the download email",
        desc: (
          <>
            Within <strong>24–48 hours</strong> you&apos;ll get an email with a
            secure link to download your <InlineCode>tinder.json</InlineCode>{" "}
            file. The link expires, so grab it promptly.
          </>
        ),
      },
      {
        title: "Upload it to SwipeStats",
        desc: "Come back here and drop the file in. Your insights generate instantly — no waiting.",
      },
    ],
    primaryCta: {
      label: "Request from Tinder",
      href: "https://account.gotinder.com/data",
    },
    secondaryCta: { label: "I have my file — upload", href: UPLOAD_HREF },
    note: (
      <>
        <strong>Deleted your account?</strong> You can still request your data
        through{" "}
        <a
          href="https://www.help.tinder.com/hc/en-us/articles/115005626726-How-do-I-request-a-copy-of-my-personal-data"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
          style={{ color: TINDER }}
        >
          Tinder&apos;s contact form
        </a>
        .
      </>
    ),
    phone: {
      app: "account.gotinder.com",
      cta: "Download my data",
      cap: "[ screenshot: Tinder data request ]",
      rows: 3,
      hl: 1,
    },
  },
  {
    id: "hinge",
    name: "Hinge",
    tabMeta: "IN-APP · 24–48h",
    icon: HingeIcon,
    iconStyle: { background: HINGE },
    iconColor: "#fff",
    tabActiveBg: "oklch(0.96 0.03 295)",
    accent: HINGE,
    numberInk: "#fff",
    sub: "Requested inside the app, in Account settings.",
    chips: [
      { label: "Done in the Hinge app", icon: DevicePhoneMobileIcon },
      { label: "Arrives in 24–48 hours", icon: ClockIcon },
      { label: "Delivered by email", icon: EnvelopeIcon },
    ],
    steps: [
      {
        title: "Open Hinge and go to your profile",
        desc: (
          <>
            Sign in, then tap your <strong>photo icon</strong> on the far right
            of the navigation bar.
          </>
        ),
      },
      {
        title: "Tap Account Settings → Download My Data",
        desc: (
          <>
            Inside Account Settings you&apos;ll find the{" "}
            <strong>Download My Data</strong> option.
          </>
        ),
      },
      {
        title: "Select your country and confirm",
        desc: (
          <>
            Choose your country, tap <strong>Download My Data</strong> again,
            confirm your email address, and tap Submit.
          </>
        ),
      },
      {
        title: "Wait for the email, then upload",
        desc: (
          <>
            Within <strong>24–48 hours</strong> Hinge emails your export. Bring
            it back here to see your insights.
          </>
        ),
      },
    ],
    primaryCta: {
      label: "Hinge's official guide",
      href: "https://hingeapp.zendesk.com/hc/en-us/articles/360004792234-Data-Requests",
    },
    secondaryCta: { label: "I have my file — upload", href: UPLOAD_HREF },
    phone: {
      app: "Hinge · Account",
      cta: "Download My Data",
      cap: "[ screenshot: Hinge → Account Settings ]",
      rows: 4,
      hl: 2,
    },
  },
  {
    id: "bumble",
    name: "Bumble",
    tabMeta: "SLOWER · up to 30d",
    icon: BumbleIcon,
    iconStyle: { background: BUMBLE },
    iconColor: BUMBLE_INK,
    tabActiveBg: "oklch(0.97 0.04 90)",
    accent: BUMBLE,
    numberInk: BUMBLE_INK,
    sub: "A manual request via Bumble's support form. The slowest of the three.",
    chips: [
      {
        label: "Can take up to 30 days",
        icon: ExclamationTriangleIcon,
        variant: "warn",
      },
      { label: "Via support form", icon: EnvelopeIcon },
    ],
    steps: [
      {
        title: "Open Bumble's data request form",
        desc: (
          <>
            Go to{" "}
            <a
              href="https://support.bumble.com/hc/en-us/requests/new"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
              style={{ color: "oklch(0.5 0.12 70)" }}
            >
              Bumble&apos;s contact form
            </a>{" "}
            and choose <strong>&quot;Request my data&quot;</strong> as the
            reason.
          </>
        ),
      },
      {
        title: "Fill in your account details",
        desc: "Provide the email or phone number tied to your Bumble account so they can match the request.",
      },
      {
        title: "Wait — this one is slow",
        desc: (
          <>
            Processing can take <strong>up to 30 days</strong>. We recommend
            setting a reminder so you don&apos;t forget about it.
          </>
        ),
      },
      {
        title: "Upload when it arrives",
        desc: (
          <>
            Once you receive your export, bring it here.{" "}
            <strong>Bumble support is coming soon</strong> — join the waitlist
            to be notified.
          </>
        ),
      },
    ],
    primaryCta: {
      label: "Request from Bumble",
      href: "https://support.bumble.com/hc/en-us/requests/new",
    },
    secondaryCta: { label: "Join the Bumble waitlist", href: "#reminder" },
    note: (
      <>
        <strong>Note:</strong> if your Bumble profile has been deleted for more
        than 28 days, data retrieval may not be possible.
      </>
    ),
    phone: {
      app: "support.bumble.com",
      cta: "Submit request",
      cap: "[ screenshot: Bumble support form ]",
      rows: 3,
      hl: 0,
    },
  },
];

/* ----------------------------------------------------------- phone mockup */

function Phone({ provider }: { provider: Provider }) {
  const { phone, accent, iconColor } = provider;
  const ctaInk = provider.id === "bumble" ? "#5c4300" : "#fff";
  return (
    <div className="sticky top-24 max-[900px]:static">
      <div className="relative mx-auto aspect-[9/18] w-full max-w-[300px] rounded-[34px] border border-gray-300 bg-white p-3 shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)]">
        <div className="absolute top-3.5 left-1/2 z-[3] h-[5px] w-[46px] -translate-x-1/2 rounded-full bg-gray-200" />
        <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-gray-50">
          <div className="flex h-[34px] flex-none items-center justify-center">
            <span className="text-[12px] font-bold text-gray-700">
              {phone.app}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-3.5">
            <div className="h-[14px] w-3/5 rounded-[5px] bg-gray-200" />
            <div className="h-[11px] w-5/6 rounded-[5px] bg-gray-200" />
            {Array.from({ length: phone.rows }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-[11px] border bg-white px-3 py-[11px]",
                  i === phone.hl ? "" : "border-gray-200",
                )}
                style={
                  i === phone.hl
                    ? {
                        borderColor: accent,
                        boxShadow: `0 0 0 3px color-mix(in oklch, ${accent} 14%, transparent)`,
                      }
                    : undefined
                }
              >
                <span
                  className="h-[22px] w-[22px] flex-none rounded-md"
                  style={{ background: accent }}
                />
                <span className="h-2 flex-1 rounded bg-gray-200" />
              </div>
            ))}
            <div
              className="mt-auto grid h-10 place-items-center rounded-[11px] text-[12.5px] font-bold"
              style={{ background: accent, color: ctaInk || iconColor }}
            >
              {phone.cta}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center font-mono text-[11px] text-gray-400">
        {phone.cap}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- panel */

function ProviderPanel({ provider }: { provider: Provider }) {
  const Icon = provider.icon;
  const ctaInk = provider.id === "bumble" ? "#5c4300" : "#fff";
  return (
    <div className="mt-6 grid grid-cols-1 items-start gap-9 lg:grid-cols-[1.25fr_0.75fr]">
      <div>
        <div className="flex items-center gap-3.5">
          <span
            className="grid h-[52px] w-[52px] flex-none place-items-center rounded-[13px] shadow-[0_1px_2px_oklch(0.2_0.02_286/0.06),0_1px_3px_oklch(0.2_0.02_286/0.05)]"
            style={{ ...provider.iconStyle, color: provider.iconColor }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-gray-900">
              {provider.name}
            </h2>
            <div className="mt-0.5 text-[13.5px] text-gray-500">
              {provider.sub}
            </div>
          </div>
        </div>

        <div className="mt-[22px] flex flex-wrap gap-2">
          {provider.chips.map((chip) => {
            const ChipIcon = chip.icon;
            return (
              <span
                key={chip.label}
                className={cn(
                  "inline-flex items-center gap-[7px] rounded-full border px-3 py-[7px] text-[12.5px] font-semibold",
                  chip.variant === "warn"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : chip.variant === "good"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-700",
                )}
              >
                <ChipIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    chip.variant === "warn"
                      ? "text-amber-500"
                      : chip.variant === "good"
                        ? "text-emerald-500"
                        : "text-gray-400",
                  )}
                />
                {chip.label}
              </span>
            );
          })}
        </div>

        <ol className="mt-6 list-none p-0">
          {provider.steps.map((step, i) => {
            const last = i === provider.steps.length - 1;
            return (
              <li key={step.title} className="relative pl-[52px] pb-[22px] last:pb-0">
                {!last && (
                  <span className="absolute top-9 bottom-1 left-[17px] w-[1.5px] bg-gray-200" />
                )}
                <span
                  className="absolute top-[-2px] left-0 grid h-[34px] w-[34px] place-items-center rounded-[10px] font-mono text-[14px] font-semibold"
                  style={{
                    background: provider.accent,
                    color: provider.numberInk,
                  }}
                >
                  {i + 1}
                </span>
                <div className="text-[15.5px] leading-[1.4] font-semibold text-gray-900">
                  {step.title}
                </div>
                <div className="mt-[5px] text-[13.5px] leading-[1.6] text-gray-600">
                  {step.desc}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={provider.primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(btnBase, btnLg)}
            style={{ background: provider.accent, color: ctaInk }}
          >
            {provider.primaryCta.label}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
          <Link
            href={provider.secondaryCta.href}
            className={cn(btnBase, btnGhost, btnLg)}
          >
            {provider.secondaryCta.label}
          </Link>
        </div>

        {provider.note && (
          <p className="mt-[18px] text-[13px] text-gray-600">{provider.note}</p>
        )}
      </div>

      <Phone provider={provider} />
    </div>
  );
}

/* ----------------------------------------------------------- switcher */

export function ProviderGuides() {
  const [active, setActive] = useState<Provider["id"]>("tinder");
  const activeProvider = providers.find((p) => p.id === active)!;

  return (
    <div>
      <div className="flex flex-wrap gap-2.5" role="tablist">
        {providers.map((p) => {
          const Icon = p.icon;
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(p.id)}
              className={cn(
                "flex items-center gap-[11px] rounded-xl border px-[18px] py-3 transition",
                isActive
                  ? "border-transparent shadow-[0_1px_2px_oklch(0.2_0.02_286/0.06),0_1px_3px_oklch(0.2_0.02_286/0.05)]"
                  : "border-gray-200 bg-white hover:border-gray-400",
              )}
              style={isActive ? { background: p.tabActiveBg } : undefined}
            >
              <span
                className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg"
                style={{ ...p.iconStyle, color: p.iconColor }}
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <span className="text-left">
                <span className="block text-[15px] font-bold text-gray-900">
                  {p.name}
                </span>
                <span className="block font-mono text-[10.5px] text-gray-500">
                  {p.tabMeta}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <ProviderPanel provider={activeProvider} />
    </div>
  );
}
