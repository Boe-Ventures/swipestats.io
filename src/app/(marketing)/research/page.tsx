import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AcademicCapIcon,
  CheckIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/20/solid";
// import { cn } from "@/components/ui/lib/utils";
import { ResearchPricingSection } from "./ResearchPricingSection";

export const metadata: Metadata = {
  title: "Research Datasets",
  description:
    "Access anonymized datasets from thousands of dating app users. Real behavior data for research, journalism, and content creation.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research Datasets | SwipeStats",
    description:
      "Access anonymized datasets from thousands of dating app users. Real behavior data for research, journalism, and content creation.",
    url: "/research",
  },
};

function HeroSection() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="research-pattern"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <rect
          fill="url(#research-pattern)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:shrink-0 lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <div className="inline-flex space-x-6">
              <span className="rounded-full bg-rose-600/10 px-3 py-1 text-sm/6 font-semibold text-rose-600 ring-1 ring-rose-600/20 ring-inset">
                Trusted by researchers
              </span>
              <span className="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-600">
                <span>University of Chicago</span>
              </span>
            </div>
          </div>
          <h1 className="mt-10 text-5xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-7xl">
            Real Dating App Data for Research, Journalism, and Content Creation
          </h1>
          <p className="mt-8 text-lg font-medium text-pretty text-gray-700 sm:text-xl/8">
            Access anonymized datasets from thousands of dating app users. Ready
            to analyze, publish, and share.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/downloads/swipestats-demo-profile.json.zip"
              target="_blank"
              className="rounded-md bg-rose-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Download Free Sample
            </Link>
            <Link
              href="#pricing"
              className="text-sm/6 font-semibold text-gray-900 transition-colors hover:text-rose-600"
            >
              Browse Datasets <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-gray-900/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4">
              <Image
                alt="SwipeStats Research Data Visualization"
                src="/images/marketing/TinderInsights.png"
                width={2432}
                height={1442}
                className="w-304 rounded-md bg-white shadow-xl ring-1 ring-gray-900/10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProofSection() {
  const stats = [
    { value: "965k+", label: "YouTube video views" },
    { value: "1000+", label: "Profiles analyzed" },
    { value: "50+", label: "Research citations" },
  ];

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-base/7 font-semibold text-rose-600">
            As Used By
          </h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-4xl">
            Trusted by researchers and creators worldwide
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
            <AcademicCapIcon className="h-12 w-12 text-rose-600" />
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              University of Chicago
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
            <VideoCameraIcon className="h-12 w-12 text-rose-600" />
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              YouTube Creators
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
            <DocumentTextIcon className="h-12 w-12 text-rose-600" />
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              Data Journalists
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8">
            <UserGroupIcon className="h-12 w-12 text-rose-600" />
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              Content Creators
            </p>
          </div>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3 lg:mx-0 lg:max-w-none">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-y-3 border-l border-gray-900/10 pl-6"
            >
              <dt className="text-sm/6 text-gray-600">{stat.label}</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ValuePropositionSection() {
  const benefits = [
    {
      name: "Real behavior, not surveys",
      description:
        "Actual swipes, matches, and messages from real users—not self-reported survey data that may be biased or inaccurate.",
      icon: ChartBarIcon,
    },
    {
      name: "Anonymized and ethical",
      description:
        "No personal information, fully consent-based collection. All data is ethically sourced and privacy-compliant.",
      icon: ShieldCheckIcon,
    },
    {
      name: "Rich data model",
      description:
        "Messaging patterns, match rates, demographics, and more. Everything you need for comprehensive analysis.",
      icon: DocumentTextIcon,
    },
    {
      name: "Regularly updated",
      description:
        "Fresh profiles added continuously at an increasing rate. Stay current with the latest dating trends.",
      icon: ClockIcon,
    },
  ];

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-base/7 font-semibold text-rose-600">
            Unique Dataset
          </h2>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
            The Data That&apos;s Almost Impossible to Get is Now Available to
            Researchers
          </p>
          <p className="mt-6 text-lg/8 text-gray-700">
            Getting real dating app data is nearly impossible. Dating apps
            rarely share user behavior, and surveys can&apos;t capture actual
            patterns. Our datasets give you authentic, anonymized data from real
            dating app users—ethically sourced and ready to analyze.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base/7 text-gray-600 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
          {benefits.map((benefit) => (
            <div key={benefit.name} className="relative pl-9">
              <dt className="inline font-semibold text-gray-900">
                <benefit.icon
                  aria-hidden="true"
                  className="absolute top-1 left-1 size-5 text-rose-600"
                />
                {benefit.name}
              </dt>{" "}
              <dd className="inline">{benefit.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function UseCasesSection() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        <h2 className="text-base/7 font-semibold text-rose-600">Use Cases</h2>
        <p className="mt-2 max-w-lg text-4xl font-semibold tracking-tight text-pretty text-gray-950 sm:text-5xl">
          From Viral Videos to Academic Research
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-16 lg:grid-cols-6 lg:grid-rows-2">
          {/* Content Creators */}
          <div className="relative lg:col-span-3">
            <div className="absolute inset-0 rounded-lg bg-white max-lg:rounded-t-4xl lg:rounded-tl-4xl" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)] lg:rounded-tl-[calc(2rem+1px)]">
              <Image
                alt="Content creator analyzing dating data"
                src="/placeholder.svg"
                className="h-80 object-cover object-top"
                width={600}
                height={320}
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-rose-600">
                  Content Creators & YouTubers
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Create viral content that resonates
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  One YouTuber used our data to create two videos analyzing
                  dating app trends generating nearly 1.5 million combined
                  views. Our datasets give you the foundation for compelling
                  stories.
                </p>
                <div className="mt-4 space-y-2">
                  <a
                    href="https://www.youtube.com/watch?v=02Ss76rFInw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-rose-600 hover:text-rose-500"
                  >
                    Watch: &quot;The Truth About Dating Apps Statistics&quot; →
                  </a>
                  <a
                    href="https://www.youtube.com/watch?v=3pvkgUc9Zbc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-rose-600 hover:text-rose-500"
                  >
                    Watch: &quot;Dating App Data Analysis&quot; →
                  </a>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 max-lg:rounded-t-4xl lg:rounded-tl-4xl" />
          </div>

          {/* Researchers */}
          <div className="relative lg:col-span-3">
            <div className="absolute inset-0 rounded-lg bg-white lg:rounded-tr-4xl" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-tr-[calc(2rem+1px)]">
              <Image
                alt="Academic research with dating data"
                src="/placeholder.svg"
                width={600}
                height={320}
                className="h-80 object-cover object-left lg:object-right"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-rose-600">
                  Researchers & Academics
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Publish credible research with real-world data
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Universities like University of Chicago use our datasets for
                  academic studies on modern dating behavior. Get access to
                  thousands of profiles for statistical significance.
                </p>
                <div className="mt-4">
                  <a
                    href="https://psycnet.apa.org/record/2025-41529-001"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-rose-600 hover:text-rose-500"
                  >
                    Read: &quot;Shortcuts to insincerity&quot; research paper →
                  </a>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 lg:rounded-tr-4xl" />
          </div>

          {/* Data Journalists */}
          <div className="relative lg:col-span-3">
            <div className="absolute inset-0 rounded-lg bg-white lg:rounded-bl-4xl" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-bl-[calc(2rem+1px)]">
              <Image
                alt="Data journalism article"
                src="/placeholder.svg"
                width={600}
                height={320}
                className="h-80 object-cover"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-rose-600">
                  Data Journalists & Writers
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Tell data-driven stories that get read
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Writers have used our datasets to publish viral articles
                  analyzing hundreds of dating profiles and uncovering
                  surprising patterns.
                </p>
                <div className="mt-4">
                  <a
                    href="https://medium.com/data-science/i-analyzed-hundreds-of-users-tinder-data-including-messages-so-you-dont-have-to-14c6dc4a5fdd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-rose-600 hover:text-rose-500"
                  >
                    Read: &quot;I analyzed hundreds of users&apos; Tinder
                    data&quot; →
                  </a>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 lg:rounded-bl-4xl" />
          </div>

          {/* Data Scientists */}
          <div className="relative lg:col-span-3">
            <div className="absolute inset-0 rounded-lg bg-white max-lg:rounded-b-4xl lg:rounded-br-4xl" />
            <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-br-[calc(2rem+1px)]">
              <Image
                alt="Data science portfolio project"
                src="/placeholder.svg"
                width={600}
                height={320}
                className="h-80 object-cover"
              />
              <div className="p-10 pt-4">
                <h3 className="text-sm/4 font-semibold text-rose-600">
                  Data Scientists & Hobbyists
                </h3>
                <p className="mt-2 text-lg font-medium tracking-tight text-gray-950">
                  Build your portfolio with unique datasets
                </p>
                <p className="mt-2 max-w-lg text-sm/6 text-gray-600">
                  Practice analysis, create visualizations, and showcase real
                  insights from a fascinating domain that everyone can relate
                  to. Perfect for portfolio projects.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-sm outline outline-black/5 max-lg:rounded-b-4xl lg:rounded-br-4xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataDetailsSection() {
  const dataPoints = [
    "Match rates and swipe behavior – See who swipes right and who gets matched",
    "Messaging patterns – First message timing, response rates, conversation length",
    "Demographics – Age, gender, location (anonymized)",
    "Usage patterns – App activity, time of day usage, session length",
    "Profile data – Photo counts, bio length, profile completeness",
  ];

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-base/7 font-semibold text-rose-600">
            Dataset Contents
          </h2>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
            Everything You Need to Start Analyzing
          </p>
          <p className="mt-6 text-lg/8 text-gray-700">
            Each dataset includes comprehensive, anonymized profiles with:
          </p>
        </div>
        <ul className="mx-auto mt-10 max-w-2xl space-y-4 text-base/7 text-gray-600 lg:mx-0 lg:max-w-none">
          {dataPoints.map((point) => (
            <li key={point} className="flex gap-x-3">
              <CheckIcon
                className="h-7 w-5 flex-none text-rose-600"
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <div className="relative isolate overflow-hidden rounded-2xl bg-gray-900 p-8 shadow-2xl sm:p-12">
            <svg
              viewBox="0 0 1024 1024"
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-x-1/2 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
            >
              <circle
                r={512}
                cx={512}
                cy={512}
                fill="url(#data-details-gradient)"
                fillOpacity="0.7"
              />
              <defs>
                <radialGradient id="data-details-gradient">
                  <stop stopColor="#E11D48" />
                  <stop offset={1} stopColor="#BE123C" />
                </radialGradient>
              </defs>
            </svg>
            <h3 className="text-lg font-semibold text-white">
              Not Sure What the Data Looks Like?
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Download a free sample profile to explore the data structure and
              see what&apos;s included.
            </p>
            <Link
              href="/downloads/swipestats-demo-profile.json.zip"
              target="_blank"
              className="mt-4 inline-block rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-100"
            >
              Download Free Sample Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonTableSection() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base/7 font-semibold text-rose-600">
            Feature Comparison
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Compare All Plans
          </p>
        </div>
        <div className="mt-16 overflow-x-auto rounded-2xl ring-1 ring-gray-900/10">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-gray-900">
                  Features
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Free Sample
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Starter Pack
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Standard Dataset
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Fresh Dataset
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Premium Dataset
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Academic License
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Price
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $0
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $15
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $50
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $150
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $300
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  From $1,500
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Number of profiles
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  1
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  10
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  1,000
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  1,000
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  3,000
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  5,000+
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Price per profile
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $0
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $1.50
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $0.05
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $0.15
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  $0.10
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  From $0.30
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Data recency
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  Sample
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  Mixed
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  Mixed
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  Most recent
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  Most recent
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  By request
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Email support
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅ Priority
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅ Priority
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅ Priority
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Monthly support
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Personal use
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Commercial use
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Publication rights
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Student distribution rights
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ❌
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  ✅
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      name: "Choose Your Dataset",
      description:
        "Select the package that fits your project needs and budget. Not sure? Start with the free sample.",
    },
    {
      name: "Instant Download",
      description:
        "Most datasets are available for immediate download. Academic licenses are processed within 24 hours.",
    },
    {
      name: "Start Analyzing",
      description:
        "Use the data in your research, articles, videos, or projects. Full documentation and data model guide included.",
    },
  ];

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-base/7 font-semibold text-rose-600">
            How It Works
          </h2>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
            Get Started in Minutes
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.name} className="flex flex-col">
                <dt className="text-base/7 font-semibold text-gray-900">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600">
                    <span className="text-lg font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  {step.name}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base/7 text-gray-600">
                  <p className="flex-auto">{step.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function ResearchFAQSection() {
  const faqs = [
    {
      question: "Is this data ethical and legal?",
      answer:
        "Yes. All data is fully anonymized and collected with explicit user consent through our platform. No personal information, names, contact details, or identifying information is included. We take privacy seriously and comply with all data protection regulations.",
    },
    {
      question: "What format is the data in?",
      answer:
        "The data is provided in JSON format with comprehensive documentation. It's easy to import into Python, R, Excel, or any analysis tool you prefer. We include a data dictionary explaining each field.",
    },
    {
      question: "Can I use this for commercial projects?",
      answer:
        "Yes! Standard Dataset and above include full commercial use rights. You can use the data for blog posts, YouTube videos, paid research, or any commercial purpose. Just check your specific tier for details.",
    },
    {
      question: "Can I publish research using this data?",
      answer:
        "Absolutely. Standard tier and above include publication rights. We only ask that you credit SwipeStats as your data source. Many researchers and journalists have already published using our datasets.",
    },
    {
      question: "What if I need different data specifications?",
      answer:
        "Contact us directly for custom datasets or specific requirements. Academic License holders can request particular timeframes, demographics, or data points. We're here to help you get what you need.",
    },
    {
      question: "How recent is the data?",
      answer:
        "Standard & Starter tiers include mixed timeframes (profiles from various periods). Fresh & Premium tiers include the most recent profiles available. Academic License holders can request specific time periods. Fresh data is added continuously as new users upload their dating app data to our platform.",
    },
    {
      question: "Is there support if I have questions?",
      answer:
        "Yes! All paid tiers include email support. Premium and Academic tiers get priority support. Academic License includes ongoing monthly support for the duration of your project.",
    },
    {
      question: "What about refunds?",
      answer:
        "If you're not satisfied with your dataset, contact us within 7 days for a full refund. We want you to be happy with your purchase.",
    },
    {
      question: "How do I cite this data in my research?",
      answer:
        'We provide standard citation formats with your dataset download. Generally: "SwipeStats.io Dating App Dataset, [Year], [Number of Profiles]"',
    },
    {
      question: "Can students access this data?",
      answer:
        "Individual students can purchase personal-use tiers. Universities and professors should consider the Academic License, which includes rights to distribute the dataset to students for educational purposes.",
    },
  ];

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Frequently Asked Questions
          </h2>
          <dl className="mt-10 space-y-8 divide-y divide-gray-900/10">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="pt-8 lg:grid lg:grid-cols-12 lg:gap-8"
              >
                <dt className="text-base font-semibold text-gray-900 lg:col-span-5">
                  {faq.question}
                </dt>
                <dd className="mt-4 lg:col-span-7 lg:mt-0">
                  <p className="text-base text-gray-600">{faq.answer}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function FinalCTASection() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
          <svg
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
          >
            <circle
              r={512}
              cx={512}
              cy={512}
              fill="url(#cta-gradient)"
              fillOpacity="0.7"
            />
            <defs>
              <radialGradient id="cta-gradient">
                <stop stopColor="#E11D48" />
                <stop offset={1} stopColor="#BE123C" />
              </radialGradient>
            </defs>
          </svg>
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
              Start Exploring Real Dating Data Today
            </h2>
            <p className="mt-6 text-lg/8 text-pretty text-gray-300">
              Join researchers, content creators, and data enthusiasts who are
              uncovering insights about modern dating.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              <Link
                href="/downloads/swipestats-demo-profile.json.zip"
                target="_blank"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Download Free Sample
              </Link>
              <Link
                href="#pricing"
                className="text-sm/6 font-semibold text-white hover:text-gray-100"
              >
                Browse Datasets
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="relative mt-16 h-80 lg:mt-8">
            <Image
              alt="SwipeStats Research Platform"
              src="/placeholder.svg"
              width={1824}
              height={1080}
              className="absolute top-0 left-0 w-228 max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
            />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="text-2xl font-bold tracking-tight text-gray-900">
            Questions?
          </h3>
          <p className="mt-4 text-lg text-gray-600">
            Have a specific research need or question about our datasets?
            We&apos;re here to help.
          </p>
          <div className="mt-6">
            <a
              href="mailto:kris@swipestats.io"
              className="inline-flex items-center rounded-md bg-rose-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-500"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <>
      <HeroSection />
      <SocialProofSection />
      <ValuePropositionSection />
      <UseCasesSection />
      <DataDetailsSection />
      <ResearchPricingSection />
      <ComparisonTableSection />
      <HowItWorksSection />
      <ResearchFAQSection />
      <FinalCTASection />
    </>
  );
}
