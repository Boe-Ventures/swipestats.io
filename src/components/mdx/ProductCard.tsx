import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Flame,
  Globe2,
  LayoutGrid,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { marketingButton } from "@/app/(marketing)/_components/marketing-ui";
import { cn } from "@/components/ui/lib/utils";

export const BLOG_PRODUCT_KEYS = [
  "insights",
  "profile-compare",
  "profile-roast",
  "prompt-assistant",
  "directory",
] as const;

export type BlogProductKey = (typeof BLOG_PRODUCT_KEYS)[number];

type ProductCardConfig = {
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  badge: string;
  icon: LucideIcon;
  accent: string;
  iconClassName: string;
  visual: React.ReactNode;
};

export interface ProductCardProps {
  product: BlogProductKey;
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  badge?: string;
  className?: string;
}

function InsightsVisual() {
  const rows = [
    { label: "Match rate", value: "7.8%", width: "78%" },
    { label: "Like rate", value: "29%", width: "42%" },
    { label: "Replies", value: "61%", width: "61%" },
  ];

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_36px_oklch(0.2_0.02_286/0.12)]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-[0.08em] text-gray-400 uppercase">
            Example profile
          </div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            Your performance
          </div>
        </div>
        <BarChart3 className="h-5 w-5 text-rose-600" />
      </div>
      <div className="mt-4 space-y-3.5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-medium text-gray-500">{row.label}</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {row.value}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: row.width }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePreview({ app, tint }: { app: string; tint: string }) {
  return (
    <div className="w-[46%] rounded-[18px] border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-800">{app}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", tint)} />
      </div>
      <div className="mt-2 aspect-[4/5] rounded-xl bg-[linear-gradient(145deg,#e5e7eb,#f9fafb_55%,#d1d5db)]" />
      <div className="mt-2 h-1.5 w-3/4 rounded-full bg-gray-200" />
      <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-gray-100" />
    </div>
  );
}

function ProfileCompareVisual() {
  return (
    <div className="relative flex min-h-52 w-full items-center justify-center gap-3 rounded-2xl border border-violet-200/70 bg-violet-50 p-4">
      <ProfilePreview app="Tinder" tint="bg-rose-500" />
      <ProfilePreview app="Hinge" tint="bg-violet-500" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-violet-200 bg-white px-3 py-1 font-mono text-[9px] font-semibold tracking-[0.08em] whitespace-nowrap text-violet-700 uppercase shadow-sm">
        Side by side
      </div>
    </div>
  );
}

function ProfileRoastVisual() {
  return (
    <div className="w-full rotate-[1.5deg] rounded-2xl border border-orange-200 bg-white p-4 shadow-[0_16px_36px_oklch(0.2_0.02_286/0.12)]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.08em] text-orange-700 uppercase">
          <Flame className="h-3 w-3" /> Mild roast
        </span>
        <span className="text-[10px] font-semibold text-gray-400">
          AI review
        </span>
      </div>
      <p className="mt-4 text-[17px] leading-snug font-bold tracking-[-0.02em] text-gray-900">
        “Strong profile. Your third photo is doing unpaid overtime.”
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Photo 1", "Keep", "text-emerald-700 bg-emerald-50"],
          ["Photo 2", "Maybe", "text-amber-700 bg-amber-50"],
          ["Photo 3", "Cut", "text-rose-700 bg-rose-50"],
        ].map(([label, verdict, classes]) => (
          <div key={label} className="rounded-xl border border-gray-100 p-2">
            <div className="text-[9px] font-medium text-gray-400">{label}</div>
            <div
              className={cn(
                "mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                classes,
              )}
            >
              {verdict}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromptAssistantVisual() {
  return (
    <div className="w-full rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_16px_36px_oklch(0.2_0.02_286/0.1)]">
      <div className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.08em] text-amber-700 uppercase">
        <Sparkles className="h-3.5 w-3.5" /> Suggested for you
      </div>
      <div className="mt-3 rounded-xl bg-amber-50/80 p-3">
        <p className="text-[10px] font-semibold text-amber-800">
          Together we could…
        </p>
        <p className="mt-1.5 text-sm leading-snug font-semibold text-gray-900">
          Find Oslo’s best cinnamon bun and defend our ranking in public.
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          Specific · playful · easy reply
        </span>
        <span className="rounded-lg border border-gray-200 px-2 py-1 text-[9px] font-semibold text-gray-600">
          Try another
        </span>
      </div>
    </div>
  );
}

function DirectoryVisual() {
  const dots = [
    ["19%", "22%"],
    ["66%", "17%"],
    ["42%", "52%"],
    ["77%", "68%"],
    ["24%", "76%"],
  ];

  return (
    <div className="relative min-h-52 w-full overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 [background-image:linear-gradient(to_right,oklch(0.88_0.03_240)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.88_0.03_240)_1px,transparent_1px)] [background-size:32px_32px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,oklch(0.97_0.02_240/0.85)_75%)]" />
      {dots.map(([left, top], index) => (
        <span
          key={`${left}-${top}`}
          className="absolute grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-sky-600 text-[9px] font-bold text-white shadow-md"
          style={{ left, top }}
        >
          {index + 1}
        </span>
      ))}
      <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between rounded-xl border border-sky-100 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div>
          <div className="text-[9px] font-medium text-gray-400">
            Recent profiles
          </div>
          <div className="text-sm font-bold text-gray-900">Tinder + Hinge</div>
        </div>
        <Globe2 className="h-5 w-5 text-sky-600" />
      </div>
    </div>
  );
}

const PRODUCT_CONFIG: Record<BlogProductKey, ProductCardConfig> = {
  insights: {
    eyebrow: "Your real data",
    title: "See what your dating app data actually says",
    description:
      "Upload your Tinder or Hinge export to uncover your match rate, activity, conversations, and cohort benchmarks.",
    buttonText: "Get my SwipeStats",
    buttonHref: "/upload",
    badge: "Free · no account required",
    icon: BarChart3,
    accent: "bg-rose-50/70",
    iconClassName: "bg-rose-100 text-rose-700",
    visual: <InsightsVisual />,
  },
  "profile-compare": {
    eyebrow: "Profile lab",
    title: "Put two versions of your profile side by side",
    description:
      "Compare photos, prompts, bios, or entire app profiles before deciding what should go live.",
    buttonText: "Compare my profiles",
    buttonHref: "/try",
    badge: "Free · no signup",
    icon: LayoutGrid,
    accent: "bg-violet-50/70",
    iconClassName: "bg-violet-100 text-violet-700",
    visual: <ProfileCompareVisual />,
  },
  "profile-roast": {
    eyebrow: "AI profile roast",
    title: "Get the honest version of profile feedback",
    description:
      "A photo-by-photo verdict, sharper prompt and bio rewrites, and a short list of changes that will actually help.",
    buttonText: "Roast my profile",
    buttonHref: "/try",
    badge: "AI feature · PLUS",
    icon: Flame,
    accent: "bg-orange-50/70",
    iconClassName: "bg-orange-100 text-orange-700",
    visual: <ProfileRoastVisual />,
  },
  "prompt-assistant": {
    eyebrow: "AI prompt assistant",
    title: "Turn a generic Hinge prompt into something worth replying to",
    description:
      "Generate prompt and answer ideas shaped around your profile, then steer the result until it sounds like you.",
    buttonText: "Build better prompts",
    buttonHref: "/try",
    badge: "AI feature · PLUS",
    icon: Sparkles,
    accent: "bg-amber-50/70",
    iconClassName: "bg-amber-100 text-amber-700",
    visual: <PromptAssistantVisual />,
  },
  directory: {
    eyebrow: "Community benchmarks",
    title: "Browse real profiles, stats, and outcomes",
    description:
      "Explore recent Tinder and Hinge profiles on the map and see how different dating experiences compare.",
    buttonText: "Explore the directory",
    buttonHref: "/directory",
    badge: "Explore real profiles",
    icon: Globe2,
    accent: "bg-sky-50/70",
    iconClassName: "bg-sky-100 text-sky-700",
    visual: <DirectoryVisual />,
  },
};

export function ProductCard({
  product,
  title,
  description,
  buttonText,
  buttonHref,
  badge,
  className,
}: ProductCardProps) {
  const config = PRODUCT_CONFIG[product];
  const Icon = config.icon;

  return (
    <aside
      className={cn(
        "not-prose my-9 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_1px_2px_oklch(0.2_0.02_286/0.04),0_18px_50px_oklch(0.2_0.02_286/0.08)]",
        className,
      )}
      data-blog-product={product}
    >
      <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-9">
          <div className="flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-gray-500 uppercase">
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-[10px]",
                config.iconClassName,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {config.eyebrow}
          </div>

          <h2 className="mt-5 text-[clamp(26px,4vw,34px)] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-gray-950">
            {title ?? config.title}
          </h2>
          <p className="mt-3.5 max-w-xl text-[16px] leading-7 text-gray-600">
            {description ?? config.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <Link
              href={buttonHref ?? config.buttonHref}
              className={marketingButton({
                variant: "primary",
                size: "default",
              })}
            >
              {buttonText ?? config.buttonText}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[12.5px] font-medium text-gray-500">
              {badge ?? config.badge}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "relative flex min-h-64 items-center justify-center overflow-hidden border-t border-gray-200 p-6 sm:p-8 lg:border-t-0 lg:border-l",
            config.accent,
          )}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/80 blur-3xl" />
          <div className="relative w-full max-w-[310px]">{config.visual}</div>
        </div>
      </div>
    </aside>
  );
}
