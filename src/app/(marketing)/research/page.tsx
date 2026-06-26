import type { Metadata } from "next";
import Link from "next/link";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckIcon,
  ClockIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  NewspaperIcon,
  PlayCircleIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  UsersIcon,
  VideoCameraIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/components/ui/lib/utils";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  marketingButton,
} from "../_components/marketing-ui";
import { CtaBand } from "../_components/CtaBand";
import { InsightsShowcase } from "../InsightsShowcase";
import { ResearchPricingSection } from "./ResearchPricingSection";

export const metadata: Metadata = {
  title: "Research Datasets",
  description:
    "Anonymized, consent-based behavior from 7,000+ real dating-app users: swipes, matches, and messages. Ready to analyze, publish, and cite.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research Datasets | SwipeStats",
    description:
      "Anonymized, consent-based behavior from 7,000+ real dating-app users: swipes, matches, and messages. Ready to analyze, publish, and cite.",
    url: "/research",
  },
};

const SAMPLE_DOWNLOAD = "/downloads/swipestats-demo-dataset.jsonl.zip";

/* ---------------------------------------------------------------- hero */

function TokKey({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "oklch(0.78 0.13 200)" }}>{children}</span>;
}
function TokStr({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "oklch(0.8 0.13 145)" }}>{children}</span>;
}
function TokNum({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "oklch(0.8 0.14 70)" }}>{children}</span>;
}
function TokBool({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "oklch(0.74 0.18 17)" }}>{children}</span>;
}
function TokPunc({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "oklch(0.6 0.01 286)" }}>{children}</span>;
}
function TokCmt({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "oklch(0.52 0.01 286)", fontStyle: "italic" }}>
      {children}
    </span>
  );
}

function HeroDataCard() {
  return (
    <div className="relative">
      <span className="absolute -top-4 right-[18px] z-[5] inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-gray-700 shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]">
        research-2026-02-23.jsonl
      </span>

      <div className="overflow-hidden rounded-t-2xl bg-gray-950 shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-[13px]">
          <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
          <span className="ml-2.5 font-mono text-[12.5px] text-gray-400">
            profile · line 1 of 7,214
          </span>
          <span className="ml-auto rounded-md bg-white/[0.06] px-2.5 py-[3px] font-mono text-[11px] text-gray-500">
            JSONL
          </span>
        </div>
        <pre
          style={{ tabSize: 2 }}
          className="m-0 overflow-x-auto px-[22px] py-5 font-mono text-[13px] leading-[1.75] text-gray-300"
        >
          <TokPunc>{"{"}</TokPunc>
          {"\n  "}
          <TokKey>{'"profile"'}</TokKey>
          <TokPunc>{": {"}</TokPunc>
          {"\n    "}
          <TokKey>{'"gender"'}</TokKey>
          <TokPunc>:</TokPunc> <TokStr>{'"MALE"'}</TokStr>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"ageAtUpload"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>27</TokNum>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"country"'}</TokKey>
          <TokPunc>:</TokPunc> <TokStr>{'"NO"'}</TokStr>
          <TokPunc>,</TokPunc> <TokCmt>{"// Norway"}</TokCmt>
          {"\n    "}
          <TokKey>{'"educationLevel"'}</TokKey>
          <TokPunc>:</TokPunc> <TokStr>{'"BACHELORS"'}</TokStr>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"userInterests"'}</TokKey>
          <TokPunc>:</TokPunc> <TokPunc>[</TokPunc>
          <TokStr>{'"Travel"'}</TokStr>
          <TokPunc>,</TokPunc> <TokStr>{'"Climbing"'}</TokStr>
          <TokPunc>],</TokPunc>
          {"\n    "}
          <TokKey>{'"instagramConnected"'}</TokKey>
          <TokPunc>:</TokPunc> <TokBool>true</TokBool>
          {"\n  "}
          <TokPunc>{"},"}</TokPunc>
          {"\n  "}
          <TokKey>{'"meta"'}</TokKey>
          <TokPunc>{": {"}</TokPunc>
          {"\n    "}
          <TokKey>{'"swipeLikesTotal"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>8432</TokNum>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"matchesTotal"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>386</TokNum>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"matchRate"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>0.046</TokNum>
          <TokPunc>,</TokPunc>
          {"\n    "}
          <TokKey>{'"messagesSentTotal"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>2914</TokNum>
          {"\n  "}
          <TokPunc>{"},"}</TokPunc>
          {"\n  "}
          <TokKey>{'"usage"'}</TokKey>
          <TokPunc>{": [{"}</TokPunc>
          {"\n      "}
          <TokKey>{'"dateStamp"'}</TokKey>
          <TokPunc>:</TokPunc> <TokStr>{'"2025-07-12"'}</TokStr>
          <TokPunc>,</TokPunc>
          {"\n      "}
          <TokKey>{'"appOpens"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>14</TokNum>
          <TokPunc>,</TokPunc>
          {"\n      "}
          <TokKey>{'"swipeLikes"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>38</TokNum>
          <TokPunc>,</TokPunc>
          {"\n      "}
          <TokKey>{'"swipePasses"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>91</TokNum>
          <TokPunc>,</TokPunc>
          {"\n      "}
          <TokKey>{'"matches"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>3</TokNum>
          <TokPunc>,</TokPunc>
          {"\n      "}
          <TokKey>{'"messagesSent"'}</TokKey>
          <TokPunc>:</TokPunc> <TokNum>22</TokNum>
          <TokPunc>,</TokPunc> <TokCmt>{"// +11 more fields"}</TokCmt>
          {"\n    "}
          <TokPunc>{"}, "}</TokPunc>
          <TokCmt>{"/* +411 daily records */"}</TokCmt>
          {"\n  "}
          <TokPunc>],</TokPunc>
          {"\n  "}
          <TokKey>{'"matches"'}</TokKey>
          <TokPunc>:</TokPunc> <TokPunc>[</TokPunc>
          <TokCmt>{"/* 386 conversations */"}</TokCmt>
          <TokPunc>]</TokPunc>
          {"\n"}
          <TokPunc>{"}"}</TokPunc>
        </pre>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-2xl border border-t-0 border-gray-200 bg-gray-200">
        {[
          { k: "Profiles", v: "7,214" },
          { k: "Daily records", v: "2.4M" },
          { k: "Messages", v: "1.1M" },
        ].map((s) => (
          <div key={s.k} className="bg-white px-4 py-3.5">
            <div className="font-mono text-[10.5px] tracking-[0.05em] text-gray-500 uppercase">
              {s.k}
            </div>
            <div className="mt-[3px] text-[21px] font-bold tracking-[-0.02em] text-gray-900 tabular-nums">
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-14 pb-6">
      <GridBg />
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <Eyebrow noRule>
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-600/20 bg-rose-50 px-3 py-1.5 text-[13px] font-semibold tracking-normal text-rose-700 normal-case">
                Trusted by researchers
              </span>
              <span className="text-gray-500">University of Chicago · APA</span>
            </Eyebrow>
            <h1 className="mt-[22px] text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-gray-900">
              The dating data that&apos;s almost impossible to get.
            </h1>
            <p className="mt-[22px] max-w-[540px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
              Anonymized, consent-based behavior from{" "}
              <strong className="font-semibold text-gray-900">
                7,000+ real dating-app users
              </strong>
              : swipes, matches, and messages. Ready to analyze, publish, and
              cite. Not a survey.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="#pricing"
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Browse datasets
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href={SAMPLE_DOWNLOAD}
                target="_blank"
                className={marketingButton({ variant: "ghost", size: "lg" })}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download free sample
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-7">
              {[
                { n: "7,000+", l: "profiles analyzed" },
                { n: "965k+", l: "YouTube views from our data" },
                { n: "50+", l: "research citations" },
              ].map((t, i) => (
                <div key={t.l} className="flex items-center gap-7">
                  {i > 0 && <div className="h-[34px] w-px bg-gray-200" />}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[22px] font-bold tracking-[-0.02em] text-gray-900 tabular-nums">
                      {t.n}
                    </span>
                    <span className="text-[12.5px] text-gray-500">{t.l}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <HeroDataCard />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- logo strip */

function LogoStrip() {
  const logos = [
    { icon: AcademicCapIcon, label: "University of Chicago" },
    { icon: VideoCameraIcon, label: "YouTube creators" },
    { icon: DocumentArrowUpIcon, label: "Data journalists" },
    { icon: UsersIcon, label: "Data scientists" },
  ];
  return (
    <section className="border-y border-gray-200 bg-gray-50 py-14">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <p className="mb-7 text-center font-mono text-[12px] tracking-[0.08em] text-gray-500 uppercase">
          Used by researchers, journalists &amp; creators worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3.5">
          {logos.map((l) => (
            <span
              key={l.label}
              className="flex items-center gap-2.5 text-[15px] font-semibold text-gray-500"
            >
              <l.icon className="h-[22px] w-[22px] text-gray-400" />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- value props */

function ValueSection() {
  const valueProps = [
    {
      icon: ChartPieIcon,
      title: "Observed, not claimed",
      body: "Actual swipes, matches, and messages with timestamps, not what people say they do on a questionnaire.",
    },
    {
      icon: ShieldCheckIcon,
      title: "Anonymized & consent-based",
      body: "No names or contact info. PII in bios and messages is LLM-redacted. Every profile was voluntarily uploaded by its owner.",
    },
    {
      icon: DocumentDuplicateIcon,
      title: "Rich, computed data model",
      body: "Five linked objects per profile, plus pre-computed metrics like match rate, response time, and ghosting. Ready to analyze.",
    },
    {
      icon: ClockIcon,
      title: "Continuously refreshed",
      body: "New profiles arrive every week as users upload their exports. Fresh tiers ship the most recent activity available.",
    },
  ];

  const surveyBad = [
    "Self-reported and memory-biased",
    "Small N, expensive to field",
    "No longitudinal behavior over time",
    "Can't see real messages",
  ];
  const surveyGood = [
    "Logged behavior, straight from the source",
    "7,000+ profiles, growing weekly",
    "Day-by-day usage spanning years",
    "Anonymized message-level text",
  ];

  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Why it's different"
          title="Real behavior, not self-reports"
          lead="Dating apps don't share user data, and surveys can't capture what people actually do. SwipeStats is built from users' own GDPR exports: the ground truth of how people swipe, match, and talk."
        />

        <div className="mt-14 grid grid-cols-1 gap-x-14 gap-y-7 md:grid-cols-2">
          {valueProps.map((p) => (
            <div key={p.title} className="flex gap-4">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-[11px] border border-rose-600/15 bg-rose-50 text-rose-600">
                <p.icon className="h-[22px] w-[22px]" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.6] text-gray-600">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-11 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h4 className="font-mono text-[13px] tracking-[0.06em] text-gray-500 uppercase">
              Typical survey data
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              {surveyBad.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2.5 text-[14.5px] text-gray-700"
                >
                  <XCircleIcon className="mt-px h-[18px] w-[18px] flex-none text-gray-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-600/30 bg-white p-6 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.06),0_1px_3px_oklch(0.2_0.02_286/0.05)]">
            <h4 className="font-mono text-[13px] tracking-[0.06em] text-rose-600 uppercase">
              SwipeStats datasets
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              {surveyGood.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2.5 text-[14.5px] text-gray-700"
                >
                  <CheckIcon className="mt-px h-[18px] w-[18px] flex-none text-rose-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- schema */

function SchemaSection() {
  const keys = [
    {
      name: "profile",
      cnt: "28 fields",
      body: "Demographics, bio, interests, education, search filters.",
    },
    {
      name: "user",
      cnt: "6 fields",
      body: "Resolved geography, languages, and timezone.",
    },
    {
      name: "meta",
      cnt: "24 metrics",
      body: "Pre-computed match rate, response time, ghosting & more.",
    },
    {
      name: "usage[]",
      cnt: "15 / day",
      body: "One record per active day: swipes, matches, messages.",
    },
    {
      name: "matches[]",
      cnt: "+ messages",
      body: "Every conversation with message-level, redacted text.",
    },
  ];

  const rows = [
    ["MALE", "27", "0.41", "0.046", "165"],
    ["FEMALE", "24", "0.18", "0.312", "88"],
    ["MALE", "31", "0.63", "0.029", "241"],
    ["FEMALE", "29", "0.22", "0.287", "112"],
    ["OTHER", "26", "0.34", "0.094", "73"],
  ];

  return (
    <section
      id="schema"
      className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]"
    >
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="The data model"
          title="Five linked objects in every profile"
          lead="Each line of the JSONL file is one user. Raw profile fields, geography, pre-computed stats, daily activity, and every conversation. All keyed together."
        />

        <div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-5">
          {keys.map((k) => (
            <div
              key={k.name}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[14px] font-semibold text-gray-900">
                  {k.name}
                </span>
                <span className="rounded-[5px] bg-rose-50 px-[7px] py-0.5 font-mono text-[11px] text-rose-600">
                  {k.cnt}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.5] text-gray-500">
                {k.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-[22px] shadow-[0_1px_2px_oklch(0.2_0.02_286/0.05)]">
            <div className="mb-[18px] flex items-baseline justify-between">
              <span className="text-[14px] font-bold text-gray-900">
                Sample rows:{" "}
                <span className="font-mono text-gray-500">meta</span>
              </span>
              <span className="font-mono text-[11px] text-gray-500">
                5 of 7,214
              </span>
            </div>
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  {["gender", "age", "likeRate", "matchRate", "ghosted"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "border-b border-gray-200 bg-gray-50 px-4 py-3 font-mono text-[12px] font-medium tracking-[0.04em] text-gray-500 uppercase",
                          i === 0 ? "text-left" : "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-gray-50">
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "border-b border-gray-200 px-4 py-3",
                          ci === 0
                            ? "font-mono text-[13px] font-medium text-gray-900"
                            : "text-right font-mono text-gray-700 tabular-nums",
                        )}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-[15px] leading-[1.7] text-gray-600">
              Everything is documented. The full data dictionary defines all 70+
              variables, their types, nullability, and how each metric is
              computed, with notes on PII redaction and data quality.
            </p>
            <div className="mt-[22px] flex flex-wrap gap-3">
              <Link
                href={SAMPLE_DOWNLOAD}
                target="_blank"
                className={marketingButton({ variant: "primary" })}
              >
                Read the documentation
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href={SAMPLE_DOWNLOAD}
                target="_blank"
                className={marketingButton({ variant: "ghost" })}
              >
                Explore a live profile
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200">
              <div className="bg-white px-6 py-[22px]">
                <div className="font-mono text-[11.5px] tracking-[0.06em] text-gray-500 uppercase">
                  Format
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-gray-900">
                  JSONL
                </div>
                <div className="mt-2 text-[13px] text-gray-500">
                  Python · R · pandas ready
                </div>
              </div>
              <div className="bg-white px-6 py-[22px]">
                <div className="font-mono text-[11.5px] tracking-[0.06em] text-gray-500 uppercase">
                  Per profile
                </div>
                <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-gray-900 tabular-nums">
                  70+
                </div>
                <div className="mt-2 text-[13px] text-gray-500">
                  documented variables
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- dashboard */

function DashboardSection() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="See it before you buy"
          title="A glimpse of what's inside"
          lead="One real, anonymized profile from the demo dataset, rendered exactly as it ships. Walk a single row end to end before you buy."
        />

        {/* the real, data-driven insights (same charts that ship), framed as the live demo */}
        <div className="mt-11">
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 shadow-[0_10px_30px_oklch(0.2_0.02_286/0.1),0_30px_60px_oklch(0.2_0.02_286/0.12)] sm:p-6 [&_[data-slot=card]]:border-gray-200/70 [&_[data-slot=card]]:shadow-none!">
            <p className="mb-3 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              The exact dashboard a buyer gets. Click through one real row.
            </p>
            <InsightsShowcase />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href={SAMPLE_DOWNLOAD}
            target="_blank"
            className={marketingButton({ variant: "ghost", size: "lg" })}
          >
            Download the free sample profile
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- use cases */

type UseCaseVisualKind = "creator" | "research" | "journalism" | "portfolio";

function MiniBars({
  values,
  tone = "rose",
}: {
  values: number[];
  tone?: "rose" | "teal" | "amber";
}) {
  const tones = {
    rose: "bg-rose-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={cn("w-full rounded-t-[5px]", tones[tone])}
          style={{ height: `${value}%` }}
        />
      ))}
    </div>
  );
}

function UseCaseVisual({ kind }: { kind: UseCaseVisualKind }) {
  if (kind === "creator") {
    return (
      <div className="relative h-[188px] overflow-hidden border-b border-gray-200 bg-gray-950 p-5 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(244,63,94,0.38),transparent_34%),radial-gradient(circle_at_78%_20%,rgba(20,184,166,0.22),transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] text-white/75">
              <PlayCircleIcon className="h-4 w-4 text-rose-300" />
              video analysis
            </span>
            <span className="font-mono text-[11px] text-white/45">
              +1.5M views
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_112px] items-end gap-4 sm:grid-cols-[1fr_128px] sm:gap-6">
            <div className="min-w-0">
              <div className="text-[44px] leading-none font-bold tracking-[-0.04em] tabular-nums">
                1.5M
              </div>
              <div className="mt-2 text-[13px] font-medium text-white/65">
                views from dating-app data stories
              </div>
            </div>
            <MiniBars values={[24, 42, 35, 58, 74, 61, 88]} />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "research") {
    return (
      <div className="relative h-[188px] overflow-hidden border-b border-gray-200 bg-white p-5">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,63,94,0.05)_0_25%,transparent_25%_50%,rgba(20,184,166,0.06)_50%_75%,transparent_75%)] bg-[length:28px_28px]" />
        <div className="relative grid h-full grid-cols-[minmax(0,1fr)_112px] gap-4 sm:grid-cols-[1fr_150px] sm:gap-5">
          <div className="flex min-w-0 flex-col justify-between rounded-[14px] border border-gray-200 bg-white p-3 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.04)] sm:p-4">
            <div className="flex min-w-0 items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-rose-600" />
              <span className="truncate font-mono text-[11px] tracking-[0.06em] text-gray-500 uppercase">
                manuscript figure
              </span>
            </div>
            <div>
              <div className="h-2.5 w-5/6 rounded-full bg-gray-900" />
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200" />
              <div className="mt-2 h-2 w-4/5 rounded-full bg-gray-200" />
            </div>
            <span className="font-mono text-[11px] text-rose-600">
              n = 7,214 profiles
            </span>
          </div>
          <div className="self-end">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-gray-500">
              <PresentationChartLineIcon className="h-4 w-4" />
              effect size
            </div>
            <MiniBars values={[36, 51, 44, 67, 72, 58]} tone="teal" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "journalism") {
    return (
      <div className="relative h-[188px] overflow-hidden border-b border-gray-200 bg-gray-50 p-5">
        <div className="absolute right-6 bottom-5 left-6 h-px bg-gray-200" />
        <div className="relative grid h-full grid-cols-[minmax(0,1fr)_108px] gap-4 sm:grid-cols-[1fr_132px] sm:gap-5">
          <div className="flex min-w-0 flex-col justify-between">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-mono text-[11px] text-gray-500">
              <NewspaperIcon className="h-4 w-4 text-rose-600" />
              data story
            </span>
            <div>
              <div className="text-[26px] leading-[1.05] font-bold tracking-[-0.03em] text-gray-900">
                The patterns surveys miss
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["swipes", "matches", "messages"].map((label) => (
                  <span
                    key={label}
                    className="rounded-[8px] border border-gray-200 bg-white px-2 py-1.5 font-mono text-[10.5px] whitespace-nowrap text-gray-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex items-end justify-center">
            <ChartBarIcon className="absolute top-2 right-1 h-5 w-5 text-amber-500" />
            <MiniBars values={[32, 48, 64, 38, 82]} tone="amber" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[188px] overflow-hidden border-b border-gray-200 bg-gray-950 p-5 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:22px_22px]" />
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)_108px] gap-4 sm:grid-cols-[1fr_138px] sm:gap-5">
        <div className="flex min-w-0 flex-col justify-between">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] text-white/70">
            <CodeBracketSquareIcon className="h-4 w-4 text-teal-300" />
            notebook.ipynb
          </span>
          <div className="font-mono text-[12px] leading-[1.7] text-white/70">
            <div className="truncate">
              <span className="text-teal-300">df</span>
              <span className="text-white/35">.</span>groupby(
              <span className="text-amber-300">&quot;age&quot;</span>)
            </div>
            <div className="truncate">
              .agg(
              <span className="text-rose-300">&quot;matchRate&quot;</span>)
            </div>
            <div className="truncate text-white/35">
              # portfolio-ready dataset
            </div>
          </div>
        </div>
        <div className="self-end rounded-[14px] border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-3 flex items-center justify-between">
            <ChartPieIcon className="h-5 w-5 text-rose-300" />
            <span className="font-mono text-[10px] text-white/40">run 12</span>
          </div>
          <MiniBars values={[40, 58, 45, 76, 64, 86]} tone="rose" />
        </div>
      </div>
    </div>
  );
}

function UseCasesSection() {
  const cases = [
    {
      visual: "creator" as const,
      role: "Creators & YouTubers",
      title: "Content that actually resonates",
      body: "One creator turned our dataset into two videos on dating-app trends. Nearly 1.5M combined views. The data is the hook.",
      links: [
        {
          href: "https://www.youtube.com/watch?v=02Ss76rFInw",
          label: '"The Truth About Dating Apps" →',
        },
        {
          href: "https://www.youtube.com/watch?v=3pvkgUc9Zbc",
          label: '"Dating App Data Analysis" →',
        },
      ],
    },
    {
      visual: "research" as const,
      role: "Researchers & academics",
      title: "Publish credible, real-world research",
      body: "University of Chicago and others have used SwipeStats for studies on modern dating. Thousands of profiles, statistical power.",
      links: [
        {
          href: "https://psycnet.apa.org/record/2025-41529-001",
          label: 'APA: "Shortcuts to insincerity" →',
        },
      ],
    },
    {
      visual: "journalism" as const,
      role: "Data journalists & writers",
      title: "Data-driven stories that get read",
      body: "Writers have analyzed hundreds of profiles, including messages, to surface patterns no survey could reveal.",
      links: [
        {
          href: "https://medium.com/data-science/i-analyzed-hundreds-of-users-tinder-data-including-messages-so-you-dont-have-to-14c6dc4a5fdd",
          label: '"I analyzed hundreds of users\' Tinder data" →',
        },
      ],
    },
    {
      visual: "portfolio" as const,
      role: "Data scientists & hobbyists",
      title: "Build a portfolio on unique data",
      body: "Practice analysis and visualization on a domain everyone relates to. A standout portfolio project with a real, rich dataset.",
      links: [{ href: SAMPLE_DOWNLOAD, label: "See the data structure →" }],
    },
  ];

  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Use cases"
          title="From viral videos to peer-reviewed research"
        />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {cases.map((c) => (
            <article
              key={c.title}
              className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_2px_6px_oklch(0.2_0.02_286/0.05),0_12px_28px_oklch(0.2_0.02_286/0.08)]"
            >
              <UseCaseVisual kind={c.visual} />
              <div className="flex flex-1 flex-col p-6">
                <span className="font-mono text-[11.5px] tracking-[0.06em] text-rose-600 uppercase">
                  {c.role}
                </span>
                <h3 className="mt-2.5 text-[19px] font-bold tracking-[-0.02em] text-gray-900">
                  {c.title}
                </h3>
                <p className="mt-2.5 flex-1 text-[14.5px] leading-[1.6] text-gray-600">
                  {c.body}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {c.links.map((l) => (
                    <a
                      key={l.href + l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13.5px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- comparison */

function ComparisonTableSection() {
  const cols = [
    "Free sample",
    "Starter",
    "Standard",
    "Fresh",
    "Premium",
    "Academic",
  ];
  const popIdx = 3;
  const rows: { label: string; cells: (string | boolean)[]; mono?: boolean }[] =
    [
      {
        label: "Price",
        mono: true,
        cells: ["$0", "$15", "$50", "$150", "$300", "$1,500+"],
      },
      {
        label: "Profiles",
        mono: true,
        cells: ["1", "10", "1,000", "1,000", "3,000", "5,000+"],
      },
      {
        label: "Price / profile",
        mono: true,
        cells: ["$0", "$1.50", "$0.05", "$0.15", "$0.10", "$0.30"],
      },
      {
        label: "Data recency",
        cells: ["Sample", "Mixed", "Mixed", "Newest", "Newest", "By request"],
      },
      {
        label: "Email support",
        cells: [false, true, true, "Priority", "Priority", "Priority"],
      },
      {
        label: "Commercial use",
        cells: [false, false, true, true, true, true],
      },
      {
        label: "Publication rights",
        cells: [false, false, true, true, true, true],
      },
      {
        label: "Student distribution",
        cells: [false, false, false, false, false, true],
      },
    ];

  const cell = (c: string | boolean) => {
    if (c === true) return <span className="font-bold text-rose-600">✓</span>;
    if (c === false) return <span className="text-gray-300">—</span>;
    if (c === "Priority")
      return <span className="font-bold text-rose-600">Priority</span>;
    return c;
  };

  return (
    <section className="border-y border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="Compare"
          title="Every plan, side by side"
        />
        <div className="mt-11 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 border-b border-gray-200 bg-gray-50 px-[18px] py-3.5 text-left text-[12px] font-bold text-gray-900">
                  Feature
                </th>
                {cols.map((c, i) => (
                  <th
                    key={c}
                    className={cn(
                      "border-b border-gray-200 bg-gray-50 px-[18px] py-3.5 text-center text-[12px] font-bold whitespace-nowrap",
                      i === popIdx ? "text-rose-600" : "text-gray-900",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="group">
                  <td className="sticky left-0 border-b border-gray-200 bg-white px-[18px] py-3.5 text-left font-semibold whitespace-nowrap text-gray-900 group-hover:bg-gray-50">
                    {r.label}
                  </td>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      className={cn(
                        "border-b border-gray-200 px-[18px] py-3.5 text-center whitespace-nowrap text-gray-700 group-hover:bg-gray-50",
                        r.mono && "font-mono tabular-nums",
                      )}
                    >
                      {cell(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- how it works */

function HowItWorksSection() {
  const steps = [
    {
      n: 1,
      title: "Choose your dataset",
      body: "Pick the package that fits your project and budget. Not sure? Start with the free sample profile.",
    },
    {
      n: 2,
      title: "Instant download",
      body: "Most datasets download immediately with a license key. Academic licenses are processed within 24 hours.",
    },
    {
      n: 3,
      title: "Start analyzing",
      body: "Load the JSONL into Python, R, or pandas. The full data dictionary ships with every download.",
    },
  ];
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <SectionHead
          center
          eyebrow="How it works"
          title="From checkout to analysis in minutes"
        />
        <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="grid h-10 w-10 place-items-center rounded-[11px] bg-rose-600 font-mono font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-[18px] text-[17px] font-bold tracking-[-0.02em] text-gray-900">
                {s.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-gray-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- faq */

function FAQSection() {
  const faqs = [
    {
      q: "Is this data ethical and legal?",
      a: "Yes. Every profile is voluntarily uploaded by its owner via their official GDPR data export, and fully anonymized. No names or contact details are included, and PII in bios and messages is LLM-redacted. We comply with applicable data-protection regulations.",
      open: true,
    },
    {
      q: "What format is the data in?",
      a: "JSONL: one JSON object per line, one line per profile. It imports cleanly into Python, R, pandas, or any tool you prefer. A full data dictionary defining every field ships with each download.",
    },
    {
      q: "Can I use this for commercial projects?",
      a: "Yes. The Standard tier and above include full commercial-use rights. Blog posts, YouTube videos, paid research, or any commercial purpose are covered. Check your tier for specifics.",
    },
    {
      q: "Can I publish research using this data?",
      a: "Absolutely. Standard tier and above include publication rights; we just ask that you cite SwipeStats as your data source. Researchers and journalists already have. See the documentation for the recommended citation format.",
    },
    {
      q: "How recent is the data?",
      a: "Starter and Standard mix timeframes. Fresh and Premium ship the most recent profiles available. Academic licenses can request specific periods. New data is added continuously as users upload their exports.",
    },
    {
      q: "How do I cite this in research?",
      a: 'We provide a standard citation with every download. Generally: "SwipeStats.io Dating App Dataset, [Year], [Number of Profiles]". The documentation page has APA and BibTeX formats ready to copy.',
    },
  ];

  return (
    <section
      id="faq"
      className="border-t border-gray-200 bg-gray-50 py-[88px] max-[720px]:py-[60px]"
    >
      <div className="mx-auto max-w-[880px] px-6 lg:px-8">
        <SectionHead center eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-10 border-t border-gray-200">
          {faqs.map((f) => (
            <details
              key={f.q}
              open={f.open}
              className="group border-b border-gray-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-[22px] text-[16.5px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <PlusIcon className="h-[22px] w-[22px] flex-none text-rose-600 transition-transform group-open:rotate-45" />
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

/* ---------------------------------------------------------------- final cta */

function FinalCTASection() {
  return (
    <section className="py-[88px] max-[720px]:py-[60px]">
      <div className="mx-auto max-w-[1216px] px-6 lg:px-8">
        <CtaBand
          eyebrow="Get started"
          title="Start exploring real dating data today"
          lead="Join the researchers, creators, and data enthusiasts uncovering how modern dating actually works."
          actions={
            <>
              <Link
                href="#pricing"
                className={marketingButton({ variant: "primary", size: "lg" })}
              >
                Browse datasets
              </Link>
              <Link
                href={SAMPLE_DOWNLOAD}
                target="_blank"
                className={marketingButton({ variant: "white", size: "lg" })}
              >
                Download free sample
              </Link>
              <a
                href="mailto:kris@swipestats.io"
                className={cn(
                  marketingButton({ variant: "bare", size: "lg" }),
                  "border border-white/20",
                )}
              >
                Talk to us
              </a>
            </>
          }
        />
      </div>
    </section>
  );
}

export default function ResearchPage() {
  return (
    <>
      <HeroSection />
      <LogoStrip />
      <ValueSection />
      <SchemaSection />
      <DashboardSection />
      <UseCasesSection />
      <ResearchPricingSection />
      <ComparisonTableSection />
      <HowItWorksSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
