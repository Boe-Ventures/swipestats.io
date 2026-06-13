import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  LinkIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  btnBase,
  btnPrimary,
  btnGhost,
  btnWhite,
  btnLg,
} from "./_ui";
import { ProviderGuides } from "./ProviderGuides";
import { ReminderForm } from "./ReminderForm";

export const metadata: Metadata = {
  title: "How to Request Your Dating Data",
  description:
    "Step-by-step guides to download your data from Tinder, Hinge, and Bumble — then turn it into personal insights with SwipeStats.",
  alternates: {
    canonical: "/how-to-request-your-data",
  },
  openGraph: {
    title: "How to Request Your Dating Data | SwipeStats",
    description:
      "Step-by-step guides to download your data from Tinder, Hinge, and Bumble — then turn it into personal insights with SwipeStats.",
    url: "/how-to-request-your-data",
  },
};

const UPLOAD_HREF = "/upload";

/* ------------------------------------------------------------------ hero */

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-11">
      <GridBg />
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="max-w-[760px]">
          <Eyebrow>Get started · 3 steps</Eyebrow>
          <h1 className="mt-5 text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-gray-900">
            How to request your dating data
          </h1>
          <p className="mt-5 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
            It&apos;s easy — but not instant. You log into your app, ask for your
            data export, and wait for an email. Once it lands, upload the file to
            SwipeStats to unlock your personal insights. Here&apos;s exactly how,
            for each app.
          </p>
          <div className="mt-[30px] flex flex-wrap items-center gap-3.5">
            <Link href="#providers" className={cn(btnBase, btnPrimary, btnLg)}>
              Pick your app
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="#reminder" className={cn(btnBase, btnGhost, btnLg)}>
              Remind me when it arrives
            </Link>
          </div>
          <p className="mt-[18px] flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
            <LockClosedIcon className="h-[15px] w-[15px] text-gray-400" />
            Already have your export file?
            <Link
              href={UPLOAD_HREF}
              className="font-semibold text-rose-600 underline underline-offset-2"
            >
              Skip straight to upload →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ flow */

function FlowSection() {
  const steps = [
    {
      n: 1,
      title: "Request your export",
      body: "Open your dating app or its website and submit a data request. It takes about two minutes.",
      badge: { icon: ClockIcon, label: "~2 min to submit" },
    },
    {
      n: 2,
      title: "Wait for the email",
      body: "The app emails you a download link. Tinder & Hinge are quick; Bumble can take longer.",
      badge: { icon: EnvelopeIcon, label: "24–48 hrs · Bumble up to 30 days" },
    },
    {
      n: 3,
      title: "Upload to SwipeStats",
      body: "Drop the file in. We strip your name, email & phone in your browser, then show your insights.",
      badge: { icon: CheckCircleIcon, label: "Instant & free" },
    },
  ];
  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white md:grid-cols-3">
          {steps.map((s, i) => {
            const Badge = s.badge.icon;
            return (
              <div
                key={s.n}
                className={cn(
                  "relative px-7 py-[30px]",
                  i > 0 && "border-gray-200 max-md:border-t md:border-l",
                )}
              >
                <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-rose-600/[0.18] bg-rose-50 font-mono text-[16px] font-semibold text-rose-600">
                  {s.n}
                </div>
                <h3 className="mt-4 text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-gray-600">
                  {s.body}
                </p>
                <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] text-gray-500">
                  <Badge className="h-3 w-3" />
                  {s.badge.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-[11px] z-[2] hidden h-[22px] w-[22px] -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white text-gray-400 md:grid">
                    <ArrowRightIcon className="h-[13px] w-[13px]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ providers */

function ProvidersSection() {
  return (
    <section id="providers" className="pt-8 pb-[88px] max-[720px]:pb-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          eyebrow="Per-app guides"
          title="Choose your app"
          lead="Each app has its own path. Pick yours for the exact steps, official request link, and how long it takes."
        />
        <div className="mt-10">
          <ProviderGuides />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ privacy */

function PrivacySection() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-5 rounded-3xl border border-rose-600/20 bg-rose-50 px-9 py-[30px] md:grid-cols-[auto_1fr_auto] md:gap-7">
          <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-rose-600 shadow-[0_1px_2px_oklch(0.5_0.2_17/0.3),0_12px_28px_oklch(0.5_0.2_17/0.22)]">
            <ShieldCheckIcon className="h-[30px] w-[30px] text-white" />
          </div>
          <div>
            <h3 className="text-[19px] font-bold tracking-[-0.02em] text-gray-900">
              Your name never reaches our servers
            </h3>
            <p className="mt-[7px] max-w-[640px] text-[14.5px] leading-[1.6] text-gray-700">
              Direct identifiers — name, email, phone, username — are stripped{" "}
              <strong>in your browser</strong> before anything is uploaded. Your
              profile is linked to a hashed anonymous ID, not your real identity.
              We&apos;re open source, so you can verify exactly how it works.
            </p>
          </div>
          <a
            href="https://github.com/Boe-Ventures/swipestats.io"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(btnBase, btnGhost, "px-[18px] py-[11px]")}
          >
            See the code
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ after */

function AfterSection() {
  const cards = [
    {
      icon: ChartPieIcon,
      title: "Your personal insights",
      body: "Swipe patterns, match rate, response times, and how you stack up against everyone else — visualized.",
      link: { label: "See a demo dashboard →", href: "/demo" },
    },
    {
      icon: GlobeAltIcon,
      title: "Compare with friends",
      body: "Your profile becomes a shareable page. Send it to friends and compare your dating stats side by side.",
      link: { label: "How sharing works →", href: UPLOAD_HREF },
    },
    {
      icon: LinkIcon,
      title: "You power the research",
      body: "Anonymized and pooled, your data helps researchers, journalists, and creators study how modern dating works.",
      link: { label: "Explore the research →", href: "/research" },
    },
  ];
  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead eyebrow="After you upload" title="What your data unlocks" />
        <div className="mt-11 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="grid h-[42px] w-[42px] place-items-center rounded-[11px] border border-rose-600/15 bg-rose-50 text-rose-600">
                <c.icon className="h-[21px] w-[21px]" />
              </div>
              <h3 className="mt-4 text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                {c.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-600">
                {c.body}
              </p>
              <Link
                href={c.link.href}
                className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-rose-600 hover:text-rose-700"
              >
                {c.link.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ reminder */

function ReminderSection() {
  return (
    <section id="reminder" className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="relative grid grid-cols-1 items-center gap-7 overflow-hidden rounded-3xl bg-gray-950 px-11 py-10 text-white max-[760px]:px-6 max-[760px]:py-8 md:grid-cols-[1fr_auto]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-[180px] -right-[120px] h-[720px] w-[720px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]"
          />
          <div className="relative z-[2]">
            <Eyebrow noRule className="text-rose-500">
              Don&apos;t lose track
            </Eyebrow>
            <h3 className="mt-3 text-[24px] font-bold tracking-[-0.02em] text-white">
              Get a reminder when to upload
            </h3>
            <p className="mt-2.5 max-w-[440px] text-[14.5px] text-gray-400">
              Data requests take a day or two — and Bumble up to a month. Leave
              your email and we&apos;ll nudge you when it&apos;s time to come back
              and upload.
            </p>
          </div>
          <ReminderForm />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */

const faqs: { q: string; a: React.ReactNode; open?: boolean }[] = [
  {
    q: "How long does it take to get my data?",
    a: "Tinder and Hinge usually email your export within 24–48 hours. Bumble is a manual process and can take up to 30 days. We recommend requesting it now and setting a reminder so you don't forget to come back.",
    open: true,
  },
  {
    q: "Is it safe to upload my data to SwipeStats?",
    a: "Yes. Direct identifiers — your name, email, phone, and username — are stripped in your browser before anything is sent to us. Your profile is linked to a hashed anonymous ID, never your real identity. We're fully open source, so you can audit exactly what happens.",
  },
  {
    q: "What file format will I receive?",
    a: (
      <>
        Each app sends a data export — Tinder delivers a{" "}
        <code className="rounded-[5px] border border-gray-200 bg-gray-100 px-1.5 py-px font-mono text-[12.5px] text-gray-800">
          tinder.json
        </code>{" "}
        file inside a ZIP, and Hinge and Bumble send similar structured exports.
        You don&apos;t need to open or edit anything; just upload the file you
        receive and SwipeStats handles the rest.
      </>
    ),
  },
  {
    q: "I deleted my account — can I still get my data?",
    a: "Often yes. Tinder lets you request data through its contact form even after deletion. Bumble, however, may not be able to retrieve data for profiles deleted more than 28 days ago. Request as soon as possible to be safe.",
  },
  {
    q: "Which apps does SwipeStats support?",
    a: "Tinder and Hinge are fully supported today. Bumble support is coming soon — join the waitlist above and we'll notify you the moment it's ready. Want another app? Let us know and we'll prioritize it.",
  },
  {
    q: "Does it cost anything?",
    a: (
      <>
        Requesting your data from the apps is free, and uploading it to
        SwipeStats to see your personal insights is free too. Researchers who
        want to license the anonymized, aggregated dataset can do so on our{" "}
        <Link href="/research" className="font-semibold text-rose-600">
          research page
        </Link>
        .
      </>
    ),
  },
];

function FaqSection() {
  return (
    <section
      id="faq"
      className="border-t border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]"
    >
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead eyebrow="FAQ" title="Requesting your data, explained" />
        <div className="mt-9 max-w-[860px] border-t border-gray-200">
          {faqs.map((f) => (
            <details
              key={f.q}
              open={f.open}
              className="group border-b border-gray-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-[22px] text-[16.5px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <PlusChevron />
              </summary>
              <div className="max-w-[760px] pb-6 text-[14.5px] leading-[1.7] text-gray-600">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlusChevron() {
  return (
    <svg
      className="h-[22px] w-[22px] flex-none text-rose-600 transition-transform group-open:rotate-45"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ final cta */

function FinalCtaSection() {
  return (
    <section className="pb-[88px] max-[720px]:pb-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-gray-950 p-14 text-gray-100 max-[720px]:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-[240px] -left-[120px] h-[720px] w-[720px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]"
          />
          <div className="relative max-w-[600px]">
            <Eyebrow noRule className="text-rose-500">
              Ready?
            </Eyebrow>
            <h2 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-white">
              Request your data now, upload in a few days
            </h2>
            <p className="mt-4 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-400">
              The clock starts when you ask. Kick off your request today and your
              insights will be waiting when the email lands.
            </p>
            <div className="mt-[30px] flex flex-wrap gap-3.5">
              <Link href="#providers" className={cn(btnBase, btnPrimary, btnLg)}>
                Pick your app
              </Link>
              <Link href={UPLOAD_HREF} className={cn(btnBase, btnWhite, btnLg)}>
                Upload your file
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HowToRequestYourDataPage() {
  return (
    <>
      <HeroSection />
      <FlowSection />
      <ProvidersSection />
      <PrivacySection />
      <AfterSection />
      <ReminderSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
