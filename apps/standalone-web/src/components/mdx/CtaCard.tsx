import Link from "next/link";
import { withInternalUtm } from "@/lib/cta-links";
import { marketingButton } from "@/app/(marketing)/_components/marketing-ui";

interface Feature {
  label: string;
  description?: string;
}

interface CtaCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  features?: Feature[];
}

const COMPARISON_ROWS = [
  { label: "Match Rate", avg: "5.3%", you: "7.8%" },
  { label: "Like Rate", avg: "46%", you: "29%" },
  { label: "Swipes/Day", avg: "54", you: "38" },
  { label: "Percentile", avg: "N/A", you: "Top 12%" },
];

function ComparisonTable() {
  return (
    <div
      aria-hidden="true"
      className="dark:border-border dark:bg-card overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-sm"
    >
      {/* Header */}
      <div className="dark:border-border dark:bg-background grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold tracking-wider uppercase">
        <span />
        <span className="dark:text-muted-foreground text-center text-gray-500">
          Avg
        </span>
        <span className="text-center text-rose-600 dark:text-rose-400">
          You
        </span>
      </div>
      {/* Rows */}
      <div className="dark:divide-border divide-y divide-gray-100">
        {COMPARISON_ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 items-center px-5 py-3.5"
          >
            <span className="dark:text-muted-foreground text-gray-600">
              {row.label}
            </span>
            <span className="dark:text-muted-foreground text-center text-gray-500 tabular-nums">
              {row.avg}
            </span>
            <span className="text-center font-semibold text-rose-600 tabular-nums blur-[5px] select-none dark:text-rose-400">
              {row.you}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CtaCard({
  title = "How Does Your Match Rate Compare?",
  description = "Find out in under 60 seconds.",
  buttonText = "Check My Swipestats",
  buttonHref = "/upload",
}: CtaCardProps) {
  return (
    <section className="not-prose dark:border-border dark:bg-card relative my-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:rounded-3xl">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {/* Left: Copy + CTA */}
        <div className="flex-1">
          <h2 className="dark:text-foreground text-[1.75rem] leading-[110%] font-bold tracking-[-0.02em] text-gray-900">
            {title}
          </h2>
          <p className="dark:text-muted-foreground mt-2.5 text-lg leading-[160%] text-gray-600">
            {description}
          </p>
          <div className="mt-5">
            <Link
              href={withInternalUtm(buttonHref, {
                medium: "blog_cta_card",
                campaign: "blog_conversion",
                content: buttonText,
              })}
              className={marketingButton({ variant: "primary", size: "lg" })}
            >
              {buttonText}
            </Link>
          </div>
        </div>

        {/* Right: Blurred stats teaser (desktop only) */}
        <div className="hidden sm:block sm:w-72">
          <ComparisonTable />
        </div>
      </div>
    </section>
  );
}
