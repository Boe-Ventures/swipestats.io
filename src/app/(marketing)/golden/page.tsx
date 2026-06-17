import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  LockClosedIcon,
  StarIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { posts } from "../BlogSection";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  marketingButton,
} from "../_components/marketing-ui";
import { CtaBand } from "../_components/CtaBand";
import { FaqList } from "../_components/FaqList";
import { InsightsShowcase } from "../InsightsShowcase";
import NewsletterCTA from "../NewsletterCTA";

export const metadata: Metadata = {
  title: "Golden Home (preview)",
  robots: { index: false, follow: false },
};

const HOW_TO = "/how-to-request-your-data";
const UPLOAD = "/upload";

/** Soft rose radial glow. The warm accent from the original home, dialed down. */
function RoseGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 rounded-full blur-3xl [background:radial-gradient(circle,oklch(0.72_0.17_15/0.16),transparent_70%)]",
        className,
      )}
    />
  );
}

/* ----------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-2">
      <GridBg />
      <RoseGlow className="top-[-160px] left-1/2 h-[560px] w-[680px] -translate-x-1/2" />
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
      body: "Ask Tinder or Hinge for your export. It arrives by email in a day or two.",
    },
    {
      title: "Upload anonymously",
      body: "Name, email & phone are removed in your browser. We only ever see a hashed ID.",
    },
    {
      title: "See your insights",
      body: "Match rate, response times, ghosting, and your cohort standing, all visualized.",
    },
    {
      title: "Compare & share",
      body: "Stack up against demographics worldwide, or share a profile with friends.",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-[88px] max-[720px]:py-[60px]"
    >
      <RoseGlow className="top-[40px] left-[-160px] h-[440px] w-[440px]" />
      <div className="relative mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          eyebrow="How it works"
          title="100% anonymous, in four steps"
          lead="Your data file never hits a server with your name on it. Identifiers are stripped in your browser before anything is uploaded."
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
    a: "Yes. Your name, email, phone, and username are stripped in your browser before anything is uploaded. Your profile is linked to a hashed anonymous ID, never your real identity. We're fully open source, so you can verify it yourself.",
  },
  {
    q: "How do I get my data from Tinder or Hinge?",
    a: "Request a copy of your data from the app. It arrives by email in 24–48 hours. We have a step-by-step guide for each app.",
  },
  {
    q: "Does it cost anything?",
    a: "Uploading your data and seeing your insights is free. SwipeStats+ unlocks deeper percentile rankings and comparisons.",
  },
];

function Faq() {
  return (
    <section
      id="faq"
      className="relative overflow-hidden py-[88px] max-[720px]:py-[60px]"
    >
      <RoseGlow className="right-[-140px] bottom-[-120px] h-[460px] w-[460px]" />
      <div className="relative mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead center eyebrow="FAQ" title="The honest answers" />
        <FaqList items={faqs} className="mx-auto mt-9 max-w-[760px] text-left" />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- testimonials */

const testimonials = [
  {
    body: "The activity charts completely changed how I understand my dating patterns. Seeing my swipe activity, match rates, and messaging trends over time helped me identify when I'm most successful.",
    name: "Female, 32",
    loc: "Berlin, Germany",
  },
  {
    body: "The profile comparison tool is brilliant. I can see my Tinder and Hinge profiles side-by-side and track which one performs better. Helped me optimize both apps quickly.",
    name: "Male, 29",
    loc: "London, UK",
  },
  {
    body: "The detailed activity charts show exactly when I get the most matches. I adjusted my active hours based on the data and saw immediate improvement.",
    name: "Male, 26",
    loc: "Sydney, Australia",
  },
];

function Testimonials() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-8 sm:p-12">
          <RoseGlow className="top-[-140px] right-[-100px] h-[460px] w-[460px]" />
          <div className="relative">
            <SectionHead
              eyebrow="Loved by daters"
              title="What thousands have found in their data"
            />
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-xs"
                >
                  <blockquote className="flex-1 text-[14.5px] leading-[1.7] text-gray-700">
                    &ldquo;{t.body}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="h-9 w-9 flex-none rounded-full bg-gray-200 ring-1 ring-gray-200" />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-gray-900">
                        {t.name}
                      </span>
                      <span className="block text-[12.5px] text-gray-500">
                        {t.loc}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- press */

function Press() {
  return (
    <section className="border-b border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          eyebrow="In the press"
          title="The data the world wrote about"
          lead="Journalists, researchers, and creators have turned SwipeStats data into stories read by hundreds of thousands."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]"
            >
              <div className="relative h-44 overflow-hidden border-b border-gray-200 bg-gray-100">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="font-mono text-[11px] tracking-[0.05em] text-rose-600 uppercase">
                  {post.category.title}
                </span>
                <h3 className="mt-2.5 text-[16.5px] leading-[1.3] font-bold tracking-[-0.01em] text-gray-900">
                  {post.title}
                </h3>
                <div className="mt-auto flex items-center gap-2 pt-5 text-[12.5px] text-gray-500">
                  <span className="font-medium text-gray-700">
                    {post.author.name}
                  </span>
                  <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- pricing */

const pricingTiers = [
  {
    name: "Small Sample",
    price: "$15",
    desc: "Get started",
    features: ["10 profiles", "Perfect to test the data model"],
    popular: false,
  },
  {
    name: "Full package",
    price: "$50",
    desc: "Scale your analysis, plus future datasets",
    features: [
      "1,000 anonymous profiles",
      "Access to future datasets",
      "Analyze at scale",
      "Direct support",
    ],
    popular: true,
  },
  {
    name: "University / Enterprise",
    price: "$1,500",
    desc: "Dedicated support & infrastructure",
    features: [
      "4k+ profiles",
      "Licence to distribute to students",
      "Direct support",
    ],
    popular: false,
  },
];

function Pricing() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Pricing"
          title="Get your own dataset"
          lead="Whether it's for a blog, a research paper, or plain curiosity, a dataset from SwipeStats gets you on the right track."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-3xl border p-7",
                tier.popular
                  ? "border-2 border-rose-600 shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]"
                  : "border-gray-200",
              )}
            >
              <div className="flex items-center justify-between gap-2.5">
                <span
                  className={cn(
                    "text-[17px] font-bold",
                    tier.popular && "text-rose-600",
                  )}
                >
                  {tier.name}
                </span>
                {tier.popular && (
                  <span className="inline-flex items-center rounded-full border border-rose-600/20 bg-rose-50 px-3 py-1 text-[13px] font-semibold text-rose-700">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-2 min-h-[38px] text-[13.5px] text-gray-500">
                {tier.desc}
              </p>
              <div className="mt-[18px] text-[38px] font-bold tracking-[-0.03em] tabular-nums text-gray-900">
                {tier.price}
              </div>
              <ul className="mt-5 flex flex-1 flex-col gap-[11px]">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex gap-2.5 text-[14px] text-gray-700"
                  >
                    <CheckIcon className="mt-px h-[18px] w-[18px] flex-none text-rose-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/research#pricing"
                className={cn(
                  "mt-6 w-full",
                  marketingButton({
                    variant: tier.popular ? "primary" : "ghost",
                  }),
                )}
              >
                {tier.price === "$1,500" ? "Contact us" : "Buy dataset"}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-7 py-5 text-center sm:flex-row sm:text-left">
          <div>
            <div className="text-[15px] font-bold text-gray-900">
              Curious about the data model?
            </div>
            <div className="mt-1 text-[13.5px] text-gray-600">
              Download one demo profile for free, or explore the open-source
              code.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/downloads/swipestats-demo-dataset.jsonl.zip"
              target="_blank"
              className={marketingButton({ variant: "ghost" })}
            >
              Download demo profile
            </Link>
            <a
              href="https://github.com/Boe-Ventures/swipestats.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Explore the code →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- newsletter */

function Newsletter() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <NewsletterCTA />
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

/* ----------------------------------------------------------------- data request band */

const TINDER_GRAD =
  "linear-gradient(135deg, oklch(0.68 0.18 35), oklch(0.63 0.21 18))";
const HINGE_COLOR = "oklch(0.5 0.18 295)";
const BUMBLE_COLOR = "oklch(0.78 0.16 85)";

function TinderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -0.06 35 40.3" fill="currentColor" className={className}>
      <path d="M10.5 16.25c-.06 0-.1 0-.14-.04-1.36-1.8-1.7-4.9-1.78-6.08-.02-.23-.28-.35-.48-.24C3.9 12.24 0 17.82 0 23.2c0 9.27 6.43 17.04 17.5 17.04 10.37 0 17.5-8 17.5-17.03C35 11.4 26.57 3.58 19.06.04c-.2-.1-.42.07-.4.28.98 6.37-.36 13.28-8.17 15.95z" />
    </svg>
  );
}
function BumbleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 2500 2500" fill="currentColor" className={className}>
      <path d="m2278.8 1314-458 791c-19.5 33.7-55.7 56.2-97.7 56.2h-915.5c-42 0-78.1-22.5-97.7-56.6l-458.9-790.6c-20.2-34.9-20.2-77.9 0-112.8l458-791c19.5-33.2 56.2-56.2 97.7-56.2h917c42 0 78.1 22.9 97.7 56.6l457.5 790.5c20.2 34.9 20.2 78-.1 112.9zm-1153.8 447.2h280.8c62.3 0 112.8-50.5 112.8-112.8s-50.5-112.8-112.8-112.8h-280.8c-62.3 0-112.8 50.5-112.8 112.8s50.5 112.8 112.8 112.8zm392.1-1004.4h-503.4c-62.4 0-113 50.6-113 113s50.6 113 113 113h503.4c62.4 0 113-50.6 113-113s-50.6-113-113-113zm204.6 389.2h-913.1c-62.4 0-113 50.6-113 113s50.6 113 113 113h913.1c62.4 0 113-50.6 113-113s-50.6-113-113-113z" />
    </svg>
  );
}
function HingeMark({ className }: { className?: string }) {
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

const dataRequestProviders = [
  {
    name: "Tinder",
    href: "https://www.help.tinder.com/hc/en-us/articles/115005626726-How-do-I-request-a-copy-of-my-personal-data",
    desc: "Easy. Follow the instructions to request your data, wait 1–3 days, and you'll get a link to download your tinder.json. Then come back here.",
    Mark: TinderMark,
    badge: { background: TINDER_GRAD },
    ink: "#fff",
  },
  {
    name: "Bumble",
    href: "https://bumble.com/en/help/how-can-i-request-my-data-or-retrieve-past-conversations",
    desc: "A bit more manual and slower. After you submit the request it can take up to 30 days before you hear back.",
    Mark: BumbleMark,
    badge: { background: BUMBLE_COLOR },
    ink: "#5c4300",
  },
  {
    name: "Hinge",
    href: "https://hingeapp.zendesk.com/hc/en-us/articles/360004792234-Data-Requests",
    desc: "Started inside the app under Account settings. All the steps are in their help article, linked here.",
    Mark: HingeMark,
    badge: { background: HINGE_COLOR },
    ink: "#fff",
  },
];

function DataRequestBand() {
  return (
    <section className="pt-[88px] max-[720px]:pt-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        {/* dark rose-glow band */}
        <div className="relative overflow-hidden rounded-[28px] bg-gray-950 px-6 pt-16 pb-40 text-center max-[720px]:pb-36">
          <RoseGlow className="top-[-160px] left-1/2 h-[520px] w-[680px] -translate-x-1/2" />
          <div className="relative">
            <Eyebrow noRule center className="text-rose-500">
              Get your data
            </Eyebrow>
            <h2 className="mx-auto mt-3.5 max-w-[620px] text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-white">
              How to request your data
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-400">
              Requesting your data is easy, but not automatic. You log into your
              app, fill out a quick form, and wait up to 24 hours. Here&apos;s
              where to start for each app.
            </p>
            <div className="mt-7 flex justify-center">
              <Link
                href="#newsletter"
                className={marketingButton({ variant: "white", size: "lg" })}
              >
                Get a reminder
              </Link>
            </div>
          </div>
        </div>

        {/* provider cards overlapping the band */}
        <div className="relative z-10 -mt-28 grid grid-cols-1 gap-6 px-2 md:grid-cols-3 max-[720px]:-mt-24">
          {dataRequestProviders.map((p) => (
            <div
              key={p.name}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)]"
            >
              <div className="relative flex-1 px-7 pt-14 pb-7">
                <span
                  className="absolute -top-7 grid h-14 w-14 place-items-center rounded-2xl shadow-[0_6px_16px_oklch(0.2_0.02_286/0.22)]"
                  style={{ ...p.badge, color: p.ink }}
                >
                  <p.Mark className="h-7 w-7" />
                </span>
                <h3 className="text-[19px] font-bold tracking-[-0.02em] text-gray-900">
                  {p.name}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.6] text-gray-600">
                  {p.desc}
                </p>
              </div>
              <div className="border-t border-gray-200 bg-gray-50 px-7 py-4">
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  Start here →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- testimonials masonry */

const masonryTestimonials = [
  {
    body: "The activity charts completely changed how I understand my dating patterns. Being able to see my swipe activity, match rates, and messaging trends over time helped me identify when I'm most successful. The profile directory is a game-changer for comparing yourself to others.",
    name: "Female, 32",
    loc: "Berlin, Germany",
  },
  {
    body: "The profile comparison tool is brilliant. I can see my Tinder and Hinge profiles side-by-side and track which one performs better. Helped me optimize both apps quickly.",
    name: "Male, 29",
    loc: "London, UK",
  },
  {
    body: "Browsing the profile directory gave me so many ideas for improving my own profile. Seeing real data from others helped me understand what actually works.",
    name: "Female, 28",
    loc: "New York, USA",
  },
  {
    body: "The detailed activity charts show exactly when I get the most matches. I adjusted my active hours based on the data and saw immediate improvement.",
    name: "Male, 26",
    loc: "Sydney, Australia",
  },
  {
    body: "Comparing my stats to the profile directory benchmarks helped me set realistic goals. Now I can see where I stand and what to improve.",
    name: "Male, 31",
    loc: "Tirana, Albania",
  },
  {
    body: "The insights dashboard breaks down everything: swipe rates, match rates, messaging patterns. Finally I understand what's working and what's not. The time-based analysis is incredibly valuable.",
    name: "Male, 28",
    loc: "São Paulo, Brazil",
  },
  {
    body: "Love the profile comparison feature. Tested different photo orders across apps and could see which setup got more matches. Made optimization so much easier.",
    name: "Female, 25",
    loc: "Cape Town, South Africa",
  },
];

function TestimonialsMasonry() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Testimonials"
          title="Worked with thousands of amazing people"
        />
        <div className="mt-12 gap-5 sm:columns-2 lg:columns-3 [&>figure]:mb-5 [&>figure]:break-inside-avoid">
          {masonryTestimonials.map((t) => (
            <figure
              key={t.loc}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs"
            >
              <blockquote className="text-[14.5px] leading-[1.7] text-gray-700">
                &ldquo;{t.body}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="h-9 w-9 flex-none rounded-full bg-gray-200 ring-1 ring-gray-200" />
                <span>
                  <span className="block text-[13.5px] font-semibold text-gray-900">
                    {t.name}
                  </span>
                  <span className="block text-[12.5px] text-gray-500">
                    {t.loc}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- about (image card) */

function AboutImage() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* founder image + quote card */}
          <figure className="relative flex min-h-[440px] flex-col justify-end overflow-hidden rounded-3xl bg-gray-950 p-10 shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)]">
            <Image
              src="/images/marketing/founder2.png"
              alt="Kristian, founder of SwipeStats"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-45 saturate-[0.75]"
            />
            <RoseGlow className="bottom-[-160px] left-[-120px] h-[420px] w-[420px]" />
            <figure className="relative">
              <blockquote className="text-[clamp(18px,2.2vw,24px)] leading-[1.4] font-semibold tracking-[-0.01em] text-white">
                &ldquo;It started as a weekend project born out of curiosity and a
                love for data. I never imagined it would reach thousands of
                people worldwide.&rdquo;
              </blockquote>
              <figcaption className="mt-5">
                <div className="font-bold text-white">Kristian Elset Bø</div>
                <div className="mt-0.5 text-[14px] text-gray-400">
                  Founder of SwipeStats.io
                </div>
              </figcaption>
            </figure>
          </figure>

          {/* about copy */}
          <div>
            <Eyebrow>About SwipeStats</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-gray-900">
              Empowering insight through data
            </h2>
            <p className="mt-5 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
              We believe in the power of data to reveal insights and inspire
              improvement. SwipeStats lets you visualize and understand your own
              dating trends, and compare them with demographics worldwide.
            </p>
            <p className="mt-4 text-[16px] leading-[1.7] text-gray-600">
              It&apos;s fully open source, built on transparency and community.
              Anyone can inspect the code, contribute, and help shape the future
              of data-driven dating insights.
            </p>
          </div>
        </div>
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
        Golden Home · preview only (noindex). The live home is unchanged.{" "}
        <Link href="/design-system" className="font-semibold underline">
          /design-system
        </Link>
      </div>
      <Hero />
      <LogoStrip />
      <Press />
      <HowItWorks />
      <DataRequestBand />
      <Providers />
      <TestimonialsMasonry />
      <Testimonials />
      <AboutImage />
      <FounderQuote />
      <ResearchTeaser />
      <Pricing />
      <Newsletter />
      <Faq />
      <FinalCta />
    </>
  );
}
