import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  DocumentCheckIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";

import { CtaBand } from "../_components/CtaBand";
import {
  GridBg,
  SectionHead,
  marketingButton,
} from "../_components/marketing-ui";
import { marketingOgImage } from "@/lib/og-images";

const SAMPLE_DOWNLOAD = "/downloads/swipestats-demo-dataset.jsonl.zip";
const CONTACT_HREF =
  "mailto:kris@swipestats.io?subject=AI%20training%20data%20inquiry";

const ogImage = marketingOgImage({
  title: "Real human interaction data for AI",
  subtitle:
    "Consent-based dating-app behavior and conversation data for training and evaluation.",
  path: "/ai-training-data",
  screenshot: "/images/og/screenshots/research.jpg",
});

export const metadata: Metadata = {
  title: "AI Training & Evaluation Data",
  description:
    "Custom, consent-based dating-app datasets for conversational AI training, domain evaluation, social reasoning, and safety work.",
  alternates: { canonical: "/ai-training-data" },
  openGraph: {
    title: "AI Training & Evaluation Data | SwipeStats",
    description:
      "Real human interaction data with documented provenance, privacy controls, and custom licensing.",
    url: "/ai-training-data",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "SwipeStats AI training and evaluation dataset",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Real Human Interaction Data for AI",
    description:
      "Custom datasets for conversational post-training and evaluation.",
    images: [ogImage],
  },
};

function DatasetPreview() {
  return (
    <div className="relative">
      <div className="absolute -top-4 right-5 z-10 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10.5px] font-semibold text-gray-700 shadow-lg">
        custom-ai-dataset.jsonl
      </div>
      <div className="overflow-hidden rounded-3xl bg-gray-950 shadow-[0_20px_60px_oklch(0.2_0.02_286/0.2)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[11px] text-gray-500">
            approved fields · sample record
          </span>
        </div>
        <div className="space-y-5 p-5 font-mono text-[12px] leading-[1.7] text-gray-300 sm:p-6 sm:text-[13px]">
          <div>
            <span className="text-gray-600">{"{"}</span>
            <div className="pl-4">
              <span className="text-cyan-300">&quot;profile&quot;</span>
              <span className="text-gray-600">: {"{"}</span>
            </div>
            <div className="pl-8">
              <span className="text-cyan-300">&quot;ageAtUpload&quot;</span>
              <span className="text-gray-600">: </span>
              <span className="text-amber-300">27</span>
              <span className="text-gray-600">,</span>
            </div>
            <div className="pl-8">
              <span className="text-cyan-300">&quot;country&quot;</span>
              <span className="text-gray-600">: </span>
              <span className="text-emerald-300">&quot;NO&quot;</span>
            </div>
            <div className="pl-4 text-gray-600">{"},"}</div>
            <div className="pl-4">
              <span className="text-cyan-300">&quot;conversation&quot;</span>
              <span className="text-gray-600">: {"{"}</span>
            </div>
            <div className="pl-8">
              <span className="text-cyan-300">&quot;primaryLanguage&quot;</span>
              <span className="text-gray-600">: </span>
              <span className="text-emerald-300">&quot;en&quot;</span>
              <span className="text-gray-600">,</span>
            </div>
            <div className="pl-8">
              <span className="text-cyan-300">
                &quot;totalMessageCount&quot;
              </span>
              <span className="text-gray-600">: </span>
              <span className="text-amber-300">18</span>
              <span className="text-gray-600">,</span>
            </div>
            <div className="pl-8">
              <span className="text-cyan-300">
                &quot;responseTimeMedianSeconds&quot;
              </span>
              <span className="text-gray-600">: </span>
              <span className="text-amber-300">420</span>
            </div>
            <div className="pl-4 text-gray-600">{"}"}</div>
            <span className="text-gray-600">{"}"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-5">
            {[
              ["Source", "GDPR exports"],
              ["Format", "JSONL"],
              ["PII", "Redacted"],
              ["License", "Custom"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
              >
                <div className="text-[9px] tracking-[0.08em] text-gray-600 uppercase">
                  {label}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-white">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-20 max-[720px]:pt-10 max-[720px]:pb-14">
      <GridBg />
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-600/20 bg-rose-50 px-3 py-1.5 text-[13px] font-semibold text-rose-700">
              <CpuChipIcon className="h-4 w-4" />
              AI training &amp; evaluation data
            </span>
            <h1 className="mt-6 max-w-[720px] text-[clamp(42px,6vw,70px)] leading-[1.01] font-bold tracking-[-0.04em] text-balance text-gray-950">
              Real human interaction data for models that need social context
            </h1>
            <p className="mt-6 max-w-[620px] text-[clamp(17px,2vw,20px)] leading-[1.65] text-gray-600">
              Custom datasets built from consent-based dating-app exports, with
              profile context, longitudinal behavior, conversation structure,
              and approved redacted text.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a
                href={CONTACT_HREF}
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Discuss your dataset
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <Link
                href={SAMPLE_DOWNLOAD}
                target="_blank"
                className={marketingButton({ variant: "ghost", size: "lg" })}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download sample
              </Link>
            </div>
            <p className="mt-5 max-w-[590px] text-[12.5px] leading-5 text-gray-500">
              Model-training and evaluation rights are scoped through a custom
              agreement. Field availability depends on the approved use case.
            </p>
            <div className="mt-9 grid max-w-[610px] grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-4">
              {[
                ["12,000+", "profiles"],
                ["294M", "swipes"],
                ["3.1M", "matches"],
                ["1.1M", "messages"],
              ].map(([value, label]) => (
                <div key={label} className="bg-white px-4 py-4">
                  <div className="text-[20px] font-bold tracking-[-0.02em] text-gray-950 tabular-nums">
                    {value}
                  </div>
                  <div className="mt-0.5 text-[10px] tracking-[0.06em] text-gray-500 uppercase">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DatasetPreview />
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const useCases = [
    {
      icon: ChatBubbleLeftRightIcon,
      eyebrow: "Post-training",
      title: "Adapt models to real social conversation",
      body: "Use naturally occurring dialogue structure, message direction, timing, and language context to develop systems that handle human conversation with more nuance.",
    },
    {
      icon: BeakerIcon,
      eyebrow: "Evaluation",
      title: "Build domain-specific tests",
      body: "Create held-out evaluations for social reasoning, conversation continuity, ambiguous intent, and privacy-preserving behavior in a high-context domain.",
    },
    {
      icon: ShieldCheckIcon,
      eyebrow: "Trust & safety",
      title: "Study sensitive interaction patterns",
      body: "Develop approved datasets for moderation, redaction, and safety research with explicit provenance and a documented handling boundary.",
    },
    {
      icon: CircleStackIcon,
      eyebrow: "Behavior modeling",
      title: "Connect language to longitudinal context",
      body: "Pair conversation structure with activity, match history, response timing, and profile context for richer modeling and analysis.",
    },
  ];

  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Built for model teams"
          title="A domain dataset with real context"
          lead="SwipeStats supports custom training and evaluation work where conversational structure, provenance, and behavioral context matter."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_2px_6px_oklch(0.2_0.02_286/0.04)] sm:p-7"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-5 font-mono text-[11px] tracking-[0.07em] text-rose-600 uppercase">
                {item.eyebrow}
              </div>
              <h2 className="mt-2 text-[21px] leading-tight font-bold tracking-[-0.025em] text-gray-950">
                {item.title}
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-gray-600">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataLayersSection() {
  const layers = [
    {
      icon: DocumentCheckIcon,
      title: "Profile context",
      fields: "Age, geography, interests, preferences, and account history",
    },
    {
      icon: ClockIcon,
      title: "Longitudinal behavior",
      fields:
        "Daily usage, swipes, matches, activity windows, and response timing",
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Conversation structure",
      fields:
        "Message order, direction, language, duration, and engagement metadata",
    },
    {
      icon: CodeBracketSquareIcon,
      title: "Approved text fields",
      fields:
        "Redacted profile and message text where the engagement allows it",
    },
  ];

  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <span className="font-mono text-[12px] tracking-[0.08em] text-rose-600 uppercase">
              Dataset layers
            </span>
            <h2 className="mt-4 text-[clamp(32px,4.5vw,50px)] leading-[1.05] font-bold tracking-[-0.035em] text-balance text-gray-950">
              Scope the fields around the model objective
            </h2>
            <p className="mt-5 text-[17px] leading-[1.7] text-gray-600">
              Every delivery begins with a field review. The resulting schema
              includes the minimum data required for the approved training or
              evaluation workflow.
            </p>
            <Link
              href={SAMPLE_DOWNLOAD}
              target="_blank"
              className="mt-7 inline-flex items-center gap-2 text-[14px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Inspect the public sample
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {layers.map((layer, index) => (
              <div
                key={layer.title}
                className="rounded-3xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-950 text-white">
                    <layer.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[18px] font-bold tracking-[-0.02em] text-gray-950">
                  {layer.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-gray-600">
                  {layer.fields}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GovernanceSection() {
  const safeguards = [
    "Source data comes from user-submitted official dating-app exports",
    "Pseudonymous identifiers replace platform and account identifiers",
    "PII-redacted fields are used for standard text deliveries",
    "Allowed model uses, retention, and redistribution are defined in writing",
    "Dataset limitations and field coverage accompany the delivery",
  ];

  return (
    <section className="bg-gray-950 py-[88px] text-white max-[720px]:py-[60px]">
      <div className="mx-auto grid max-w-[1216px] gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-rose-200">
            <LockClosedIcon className="h-4 w-4" />
            Provenance &amp; governance
          </span>
          <h2 className="mt-5 text-[clamp(32px,4.5vw,52px)] leading-[1.04] font-bold tracking-[-0.035em] text-balance">
            A documented data boundary for sensitive human context
          </h2>
          <p className="mt-5 max-w-[570px] text-[17px] leading-[1.7] text-gray-300">
            Dating conversations need a higher handling standard. We scope each
            engagement around provenance, privacy controls, intended model use,
            and delivery requirements.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8">
          <div className="space-y-4">
            {safeguards.map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-none text-rose-300" />
                <span className="text-[14.5px] leading-6 text-gray-300">
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-white/10 pt-6 text-[12.5px] leading-5 text-gray-500">
            Final suitability, legal terms, and security requirements are
            reviewed for each customer and intended model use.
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const steps = [
    {
      n: "01",
      title: "Define the model objective",
      body: "Share the intended training, evaluation, safety, or research workflow.",
    },
    {
      n: "02",
      title: "Review fields and coverage",
      body: "We confirm available cohorts, languages, time ranges, text fields, and sample size.",
    },
    {
      n: "03",
      title: "Agree the data boundary",
      body: "The license records permitted model uses, retention, security, and redistribution terms.",
    },
    {
      n: "04",
      title: "Receive a documented export",
      body: "Delivery includes versioned JSONL, a schema guide, coverage notes, and citation metadata.",
    },
  ];

  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Custom delivery"
          title="From model objective to usable dataset"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-3xl border border-gray-200 bg-white p-6"
            >
              <span className="font-mono text-[12px] font-semibold text-rose-600">
                {step.n}
              </span>
              <h3 className="mt-4 text-[17px] leading-tight font-bold text-gray-950">
                {step.title}
              </h3>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-gray-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Can we use the data to train or fine-tune a model?",
      a: "Potentially. AI training and evaluation are licensed through a custom agreement that names the approved model use, fields, retention period, and redistribution boundary.",
    },
    {
      q: "Does the dataset include conversation text?",
      a: "Conversation structure and derived metrics are broadly available. Redacted message text can be considered for approved custom engagements after a field and privacy review.",
    },
    {
      q: "Does a delivery contain raw personal information?",
      a: "Standard text deliveries use redacted fields and pseudonymous identifiers. The final schema and handling requirements are documented before delivery.",
    },
    {
      q: "Can we request a particular cohort or language?",
      a: "Yes, subject to coverage and privacy thresholds. We inventory the requested slice before confirming a dataset size or delivery date.",
    },
  ];

  return (
    <section className="border-t border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[880px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Questions"
          title="Before you scope a dataset"
        />
        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-gray-200 bg-white px-5 py-4 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none pr-8 text-[15px] font-semibold text-gray-950">
                {faq.q}
              </summary>
              <p className="mt-3 max-w-[760px] text-[14px] leading-[1.65] text-gray-600">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-[72px] max-[720px]:py-[52px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <CtaBand
          center
          eyebrow="Custom AI datasets"
          title="Bring us the model objective"
          lead="We’ll confirm the available fields, privacy boundary, sample size, and licensing path for your training or evaluation work."
          actions={
            <>
              <a
                href={CONTACT_HREF}
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Discuss your dataset
              </a>
              <Link
                href="/research"
                className={marketingButton({ variant: "bare", size: "lg" })}
              >
                Explore all research data
              </Link>
            </>
          }
        />
      </div>
    </section>
  );
}

export default function AITrainingDataPage() {
  return (
    <>
      <HeroSection />
      <UseCasesSection />
      <DataLayersSection />
      <GovernanceSection />
      <ProcessSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
