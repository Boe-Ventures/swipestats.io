import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  StarIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  marketingButton,
} from "../_components/marketing-ui";
import { CtaBand } from "../_components/CtaBand";
import { FaqList } from "../_components/FaqList";
import { InsightsShowcase } from "../InsightsShowcase";

export const metadata: Metadata = {
  title: "Golden Home (preview)",
  robots: { index: false, follow: false },
};

const HOW_TO = "/how-to-request-your-data";
const UPLOAD = "/upload";

/* ----------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-2">
      <GridBg />
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="mx-auto max-w-[820px] text-center">
          <Eyebrow noRule center>
            Your dating data, decoded
          </Eyebrow>
          <h1 className="mt-5 text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-gray-900">
            Every swipe you&apos;ve made, finally adds up.
          </h1>
          <p className="mx-auto mt-[22px] max-w-[600px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
            Upload your Tinder or Hinge export and see your real match rate,
            response times, and exactly how you stack up against 7,000+ people.
            Anonymous. Free.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href={UPLOAD}
              className={marketingButton({ variant: "primary", size: "lg" })}
            >
              Upload data
              <ArrowUpTrayIcon className="h-4 w-4" />
            </Link>
            <Link
              href={HOW_TO}
              className={marketingButton({ variant: "ghost", size: "lg" })}
            >
              How to request your data →
            </Link>
          </div>
          <div className="mt-6 inline-flex items-center gap-3 text-[13.5px] text-gray-600">
            <span className="flex gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4" />
              ))}
            </span>
            <span>
              <strong className="text-gray-900">Rated 5 stars</strong> by over{" "}
              <span className="font-semibold text-rose-600">4,000 users</span>
            </span>
          </div>
        </div>

        {/* the real, richer insights showcase */}
        <div className="mt-12">
          <InsightsShowcase />
        </div>

        <div className="mt-8 text-center">
          <Link
            href={UPLOAD}
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-gray-900 hover:text-rose-600"
          >
            Get your own SwipeStats
            <span className="text-rose-600">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- logos */

function LogoStrip() {
  const items = [
    "University of Chicago",
    "965k+ YouTube views",
    "APA · peer-reviewed",
    "Open source",
  ];
  return (
    <section className="mt-10 border-y border-gray-200 bg-gray-50 py-14">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <p className="mb-7 text-center font-mono text-[12px] tracking-[0.08em] text-gray-500 uppercase">
          Featured in research, journalism &amp; 965k+ views of content
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {items.map((label) => (
            <span
              key={label}
              className="text-[14.5px] font-semibold text-gray-500"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- how it works */

function HowItWorks() {
  const steps = [
    {
      title: "Request your data",
      body: "Ask Tinder or Hinge for your export — it arrives by email in a day or two.",
    },
    {
      title: "Upload anonymously",
      body: "Name, email & phone are removed in your browser. We only ever see a hashed ID.",
    },
    {
      title: "See your insights",
      body: "Match rate, response times, ghosting, and your cohort standing — visualized.",
    },
    {
      title: "Compare & share",
      body: "Stack up against demographics worldwide, or share a profile with friends.",
    },
  ];
  return (
    <section id="how-it-works" className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          eyebrow="How it works"
          title="100% anonymous, in four steps"
          lead="Your data file never hits a server with your name on it — identifiers are stripped in your browser before anything is uploaded."
        />
        <div className="mt-13 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title}>
              <div className="grid h-[46px] w-[46px] place-items-center rounded-xl border border-rose-600/15 bg-rose-50 font-mono text-[17px] font-semibold text-rose-600">
                {i + 1}
              </div>
              <h3 className="mt-[18px] text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-gray-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- providers */

function Providers() {
  const provs = [
    {
      name: "Tinder",
      badge: "Supported",
      supported: true,
      body: "The easiest export. Request it and get your tinder.json by email in 24–48 hours.",
      href: HOW_TO,
      cta: "How to request",
    },
    {
      name: "Hinge",
      badge: "Supported",
      supported: true,
      body: "Request it inside the app under Account settings. Arrives within 24–48 hours.",
      href: HOW_TO,
      cta: "How to request",
    },
    {
      name: "Bumble",
      badge: "Coming soon",
      supported: false,
      body: "Support is on the way. Join the waitlist and we'll notify you the moment it's ready.",
      href: HOW_TO,
      cta: "Join the waitlist",
    },
  ];
  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead eyebrow="Get your data" title="Works with the apps you use" />
        <div className="mt-12 grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {provs.map((p) => (
            <div
              key={p.name}
              className="rounded-3xl border border-gray-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-bold text-gray-900">
                  {p.name}
                </span>
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-[10.5px]",
                    p.supported
                      ? "border-rose-600/20 bg-rose-50 text-rose-700"
                      : "border-gray-200 bg-gray-100 text-gray-600",
                  )}
                >
                  {p.badge}
                </span>
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-gray-600">
                {p.body}
              </p>
              <Link
                href={p.href}
                className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-gray-900 hover:text-rose-600"
              >
                {p.cta}
                <span className="text-rose-600">→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- quote */

function FounderQuote() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <figure className="relative overflow-hidden rounded-[28px] bg-gray-950 p-16 max-[720px]:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-[200px] -left-[140px] h-[720px] w-[720px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]"
          />
          <div className="relative">
            <Eyebrow noRule className="text-rose-500">
              Since 2019
            </Eyebrow>
            <blockquote className="mt-4 max-w-[760px] text-[clamp(20px,2.6vw,28px)] leading-[1.4] font-semibold tracking-[-0.02em] text-white">
              &quot;It started as a weekend project born out of curiosity and a
              love for data. I never imagined it would reach thousands of people
              worldwide. The impact has been beyond anything I anticipated.&quot;
            </blockquote>
            <figcaption className="mt-6">
              <div className="font-bold text-white">Kristian Elset Bø</div>
              <div className="mt-0.5 text-[14px] text-gray-400">
                Founder of SwipeStats.io
              </div>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- research teaser */

function ResearchTeaser() {
  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow>For researchers &amp; creators</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-gray-900">
              7,000+ anonymized profiles, ready to analyze
            </h2>
            <p className="mt-4 max-w-[560px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
              The same data, aggregated and anonymized into a licensable dataset
              for research, journalism, and content. Used by University of
              Chicago, APA, and creators with 965k+ views.
            </p>
          </div>
          <Link
            href="/research"
            className={cn(
              marketingButton({ variant: "primary", size: "lg" }),
              "whitespace-nowrap",
            )}
          >
            Explore research →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- faq */

const faqs = [
  {
    q: "Is my data actually anonymous?",
    a: "Yes. Your name, email, phone, and username are stripped in your browser before anything is uploaded. Your profile is linked to a hashed anonymous ID — never your real identity. We're fully open source, so you can verify it yourself.",
  },
  {
    q: "How do I get my data from Tinder or Hinge?",
    a: "Request a copy of your data from the app — it arrives by email in 24–48 hours. We have a step-by-step guide for each app.",
  },
  {
    q: "Does it cost anything?",
    a: "Uploading your data and seeing your insights is free. SwipeStats+ unlocks deeper percentile rankings and comparisons.",
  },
];

function Faq() {
  return (
    <section id="faq" className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead eyebrow="FAQ" title="The honest answers" />
        <FaqList items={faqs} className="mt-9 max-w-[820px]" />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- final cta */

function FinalCta() {
  return (
    <section className="pb-[88px] max-[720px]:pb-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <CtaBand
          center
          glow="bottom-left"
          eyebrow="Ready?"
          title="See how you really date"
          lead="Upload your export and get your insights in minutes. Free, anonymous, open source."
          actions={
            <>
              <Link
                href={UPLOAD}
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Upload data
                <ArrowDownTrayIcon className="h-4 w-4" />
              </Link>
              <Link
                href={HOW_TO}
                className={marketingButton({ variant: "white", size: "lg" })}
              >
                How to request your data
              </Link>
            </>
          }
        />
      </div>
    </section>
  );
}

export default function GoldenHomePage() {
  return (
    <>
      {/* preview banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-[12.5px] font-medium text-amber-800">
        <LockClosedIcon className="mr-1 inline h-3.5 w-3.5" />
        Golden Home — preview only (noindex). The live home is unchanged.{" "}
        <Link href="/design-system" className="font-semibold underline">
          /design-system
        </Link>
      </div>
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <Providers />
      <FounderQuote />
      <ResearchTeaser />
      <Faq />
      <FinalCta />
    </>
  );
}
