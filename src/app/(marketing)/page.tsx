import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { posts } from "./BlogSection";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  marketingButton,
} from "./_components/marketing-ui";
import { CtaBand } from "./_components/CtaBand";
import { FaqList } from "./_components/FaqList";
import { InsightsShowcase } from "./InsightsShowcase";
import NewsletterCTA from "./NewsletterCTA";

export const metadata: Metadata = {
  title: "SwipeStats - Analyze Your Dating App Data",
  description:
    "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare your swipes, matches, and messages with others worldwide.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SwipeStats - Analyze Your Dating App Data",
    description:
      "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare your swipes, matches, and messages with others worldwide.",
    url: "/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SwipeStats",
  url: "https://www.swipestats.io",
  logo: "https://www.swipestats.io/icon.png",
  description:
    "Dating app analytics platform. Upload your Tinder or Hinge data and get insights on match rates, swipe patterns, and percentile rankings from 10,000+ anonymous profiles.",
  foundingDate: "2019",
  sameAs: [
    "https://www.instagram.com/swipestats.io",
    "https://x.com/SwipeStats",
  ],
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
    <section className="relative overflow-x-clip pt-16 pb-12">
      <GridBg />
      <RoseGlow className="top-[-160px] left-1/2 h-[560px] w-[680px] -translate-x-1/2" />
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="mx-auto max-w-[820px] text-center">
          <Eyebrow noRule center>
            Tinder · Hinge · Bumble
          </Eyebrow>
          {/* Backup: render <HeroHeadlineRotating /> here for the rotating
              Tinder/Hinge/Bumble typewriter variant (_components/HeroHeadlineRotating). */}
          <h1 className="mt-5 text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-gray-900">
            Your dating data, finally visualized.
          </h1>
          <p className="mx-auto mt-[22px] max-w-[600px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
            Every swipe, match, and message, turned into charts and ranked
            against 10,000+ anonymous profiles.
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13.5px] font-medium text-gray-600">
            <span>Free to upload</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>100% anonymous</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>No account required</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>Open source</span>
          </div>
        </div>

        {/* the real, richer insights showcase, framed as the live demo */}
        <div className="mt-12">
          <div className="mx-auto max-w-[1120px] rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-[0_8px_24px_oklch(0.2_0.02_286/0.08),0_18px_44px_oklch(0.2_0.02_286/0.1)] sm:p-6 [&_[data-slot=card]]:border-gray-200/70 [&_[data-slot=card]]:shadow-none!">
            <p className="mb-3 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Real demo, real data. Click through an anonymized profile
              yourself.
            </p>
            <InsightsShowcase />
          </div>
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
      className="relative overflow-x-clip py-[88px] max-[720px]:py-[60px]"
    >
      <RoseGlow className="top-[40px] left-[-160px] h-[440px] w-[440px]" />
      <div className="relative mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="How it works"
          title="100% anonymous, in four steps"
          lead="Your data file never hits a server with your name on it. Identifiers are stripped in your browser before anything is uploaded."
        />
        <div className="mt-13 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col items-center text-center"
            >
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

/* ----------------------------------------------------------------- faq */

const faqs = [
  {
    q: "Is my data actually anonymous?",
    a: "Yes. Your name, email, phone, and username are stripped in your browser before anything is uploaded. Your profile is linked to a hashed anonymous ID, never your real identity. We're fully open source, so you can verify it yourself.",
  },
  {
    q: "What kind of insights can I gain?",
    a: "Your swipe patterns, match rates, response times, ghosting, and exactly how you compare to thousands of others, across your whole dating history. Real behavior, not self-reported guesses.",
  },
  {
    q: "How do I get my data from Tinder or Hinge?",
    a: "Request a copy of your data from the app. It arrives by email in 24–48 hours. We have a step-by-step guide for each app.",
  },
  {
    q: "How long does it take to get my data?",
    a: "Usually within 24–48 hours of requesting. Bumble can take up to 30 days. Request it now and leave your email so we can remind you when it lands.",
  },
  {
    q: "How much of my history can I see?",
    a: "Your entire active history, even if you started back in 2012 when Tinder first launched.",
  },
  {
    q: "Can I use the data for research or an article?",
    a: "Yes. Anonymized, aggregated datasets are available for research, journalism, and content. Researchers at the University of Chicago, the APA, and creators with 965k+ views already have.",
  },
  {
    q: "Does it work with Bumble or other apps?",
    a: "Tinder and Hinge are fully supported today. Bumble support is coming soon, join the waitlist and we'll notify you the moment it's ready.",
  },
  {
    q: "Can I upload new data later?",
    a: "Anytime. Every time you upload, you can compare against your own previous data and watch how your dating life changes over time.",
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
      className="relative overflow-x-clip py-[88px] max-[720px]:py-[60px]"
    >
      <RoseGlow className="right-[-140px] bottom-[-120px] h-[460px] w-[460px]" />
      <div className="relative mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead center eyebrow="FAQ" title="The honest answers" />
        <FaqList
          items={faqs}
          className="mx-auto mt-9 max-w-[760px] text-left"
        />
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
          center
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

/* ------------------------------------------------- research (teaser + pricing) */

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

function Research() {
  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        {/* researcher hand-off header (genuine two-column split → left-aligned) */}
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow>For researchers &amp; creators</Eyebrow>
            <h2 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-gray-900">
              10,000+ anonymized profiles, ready to analyze
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

        {/* dataset packages, folded in beneath the teaser */}
        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-3xl border bg-white p-7",
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
              <div className="mt-[18px] text-[38px] font-bold tracking-[-0.03em] text-gray-900 tabular-nums">
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
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-7 py-5 text-center sm:flex-row sm:text-left">
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
          eyebrow="Ready to explore?"
          title="Upload your data today"
          lead="Turn your Tinder or Hinge export into clear insights in minutes. Free, anonymous, open source."
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

function TinderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -0.06 35 40.3" fill="currentColor" className={className}>
      <path d="M10.5 16.25c-.06 0-.1 0-.14-.04-1.36-1.8-1.7-4.9-1.78-6.08-.02-.23-.28-.35-.48-.24C3.9 12.24 0 17.82 0 23.2c0 9.27 6.43 17.04 17.5 17.04 10.37 0 17.5-8 17.5-17.03C35 11.4 26.57 3.58 19.06.04c-.2-.1-.42.07-.4.28.98 6.37-.36 13.28-8.17 15.95z" />
    </svg>
  );
}

type DataRequestProvider = {
  name: string;
  href: string;
  desc: string;
} & (
  | {
      kind: "mark";
      Mark: typeof TinderMark;
      badge: { background: string };
      ink: string;
    }
  | {
      kind: "image";
      iconImage: string;
    }
);

const dataRequestProviders: DataRequestProvider[] = [
  {
    kind: "mark",
    name: "Tinder",
    href: "https://www.help.tinder.com/hc/en-us/articles/115005626726-How-do-I-request-a-copy-of-my-personal-data",
    desc: "Easy. Follow the instructions to request your data, wait 1–3 days, and you'll get a link to download your tinder.json. Then come back here.",
    Mark: TinderMark,
    badge: { background: TINDER_GRAD },
    ink: "#fff",
  },
  {
    kind: "image",
    name: "Bumble",
    href: "https://bumble.com/en/help/how-can-i-request-my-data-or-retrieve-past-conversations",
    desc: "A bit more manual and slower. After you submit the request it can take up to 30 days before you hear back.",
    iconImage: "/images/brand/bumble.jpg",
  },
  {
    kind: "image",
    name: "Hinge",
    href: "https://hingeapp.zendesk.com/hc/en-us/articles/360004792234-Data-Requests",
    desc: "Started inside the app under Account settings. All the steps are in their help article, linked here.",
    iconImage: "/images/brand/hinge.jpg",
  },
];

function DataRequestBand() {
  return (
    <section className="pt-[88px] max-[720px]:pt-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        {/* dark rose-glow band */}
        <div className="relative overflow-hidden rounded-[28px] bg-gray-950 px-6 pt-20 pb-44 text-center max-[720px]:pb-40">
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
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Get a reminder
              </Link>
            </div>
          </div>
        </div>

        {/* provider cards overlapping the band */}
        <div className="relative z-10 -mt-32 grid grid-cols-1 gap-6 px-2 max-[720px]:-mt-28 md:grid-cols-3">
          {dataRequestProviders.map((p) => (
            <div
              key={p.name}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)]"
            >
              <div className="relative flex-1 px-7 pt-14 pb-7">
                <span
                  className="absolute -top-7 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl shadow-[0_6px_16px_oklch(0.2_0.02_286/0.22)]"
                  style={
                    p.kind === "mark" ? { ...p.badge, color: p.ink } : undefined
                  }
                >
                  {p.kind === "image" ? (
                    <Image
                      src={p.iconImage}
                      alt={`${p.name} logo`}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <p.Mark className="h-7 w-7" />
                  )}
                </span>
                <h3 className="text-[19px] font-bold tracking-[-0.02em] text-gray-900">
                  {p.name}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.6] text-gray-600">
                  {p.desc}
                </p>
              </div>
              <div className="rounded-b-2xl border-t border-gray-200 bg-gray-50 px-7 py-4">
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
    image: "/images/marketing/testimonials/f37.jpeg",
  },
  {
    body: "The profile comparison tool is brilliant. I can see my Tinder and Hinge profiles side-by-side and track which one performs better. Helped me optimize both apps quickly.",
    name: "Male, 29",
    loc: "London, UK",
    image: "/images/marketing/testimonials/m29.jpeg",
  },
  {
    body: "Browsing the profile directory gave me so many ideas for improving my own profile. Seeing real data from others helped me understand what actually works.",
    name: "Female, 28",
    loc: "New York, USA",
    image: "/images/marketing/testimonials/f34.jpeg",
  },
  {
    body: "The detailed activity charts show exactly when I get the most matches. I adjusted my active hours based on the data and saw immediate improvement.",
    name: "Male, 26",
    loc: "Sydney, Australia",
    image: "/images/marketing/testimonials/m26.jpeg",
  },
  {
    body: "Comparing my stats to the profile directory benchmarks helped me set realistic goals. Now I can see where I stand and what to improve.",
    name: "Male, 31",
    loc: "Tirana, Albania",
    image: "/images/marketing/testimonials/m37.jpeg",
  },
  {
    body: "The insights dashboard breaks down everything: swipe rates, match rates, messaging patterns. Finally I understand what's working and what's not. The time-based analysis is incredibly valuable.",
    name: "Male, 28",
    loc: "São Paulo, Brazil",
    image: "/images/marketing/testimonials/m32.jpeg",
  },
  {
    body: "Love the profile comparison feature. Tested different photo orders across apps and could see which setup got more matches. Made optimization so much easier.",
    name: "Female, 25",
    loc: "Cape Town, South Africa",
    image: "/images/marketing/testimonials/f25.jpeg",
  },
];

function TestimonialsMasonry() {
  return (
    <section className="relative overflow-x-clip py-[88px] max-[720px]:py-[60px]">
      <RoseGlow className="top-[-120px] left-[-160px] h-[520px] w-[520px]" />
      <RoseGlow className="right-[-180px] bottom-[-140px] h-[480px] w-[480px]" />
      <div className="relative mx-auto max-w-[1216px] px-6 lg:px-8">
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
                <Image
                  src={t.image}
                  alt={t.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 flex-none rounded-full bg-gray-100 object-cover ring-1 ring-gray-200"
                />
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
              className="scale-105 object-cover opacity-35 blur-[2px] saturate-[0.65]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-gray-950/90 via-gray-950/60 to-gray-950/30" />
            <RoseGlow className="bottom-[-160px] left-[-120px] h-[420px] w-[420px]" />
            <figure className="relative">
              <blockquote className="text-[clamp(18px,2.2vw,24px)] leading-[1.4] font-semibold tracking-[-0.01em] text-white">
                &ldquo;It started as a weekend project born out of curiosity and
                a love for data. I never imagined it would reach thousands of
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <DataRequestBand />
      <Newsletter />
      <TestimonialsMasonry />
      <Press />
      <AboutImage />
      <Research />
      <Faq />
      <FinalCta />
    </>
  );
}
