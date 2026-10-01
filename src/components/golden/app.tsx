import { cn } from "@/components/ui/lib/utils";

/**
 * Golden APP-MODE primitives — the "data, quiet chrome" dialect.
 * Functional type scale, big tabular numbers, neutral surfaces. Ported from
 * golden.css. Server-safe (no hooks). Pairs with the marketing-ui primitives.
 */

/* ---------------------------------------------------------------- page header */

export function AppPageHeader({
  kicker,
  title,
  sub,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        {kicker && (
          <div className="dark:text-muted-foreground font-mono text-[11px] font-medium tracking-[0.07em] text-gray-500 uppercase">
            {kicker}
          </div>
        )}
        <h1 className="dark:text-foreground mt-1 text-[clamp(28px,3.4vw,40px)] leading-[1.04] font-bold tracking-[-0.03em] text-gray-900">
          {title}
        </h1>
        {sub && (
          <p className="dark:text-muted-foreground mt-1.5 text-[15px] text-gray-600">
            {sub}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------------------------------------- panel */

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "dark:border-border dark:bg-card rounded-2xl border border-gray-200 bg-white p-[22px] shadow-[0_1px_2px_oklch(0.2_0.02_286/0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  meta,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <span className="dark:text-foreground text-[15px] font-bold tracking-[-0.01em] text-gray-900">
        {title}
      </span>
      {meta && (
        <span className="dark:text-muted-foreground font-mono text-[11px] text-gray-500">
          {meta}
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- hero stats */

export function HeroStats({
  lead,
  stats,
  className,
}: {
  lead: { kicker: string; value: React.ReactNode; sub?: React.ReactNode };
  stats: { k: string; v: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dark:border-border dark:bg-card grid grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_1px_2px_oklch(0.2_0.02_286/0.06),0_1px_3px_oklch(0.2_0.02_286/0.05)] md:grid-cols-[1.3fr_1fr]",
        className,
      )}
    >
      <div className="dark:border-border border-gray-200 px-[30px] py-7 max-md:border-b md:border-r">
        <div className="dark:text-muted-foreground font-mono text-[11px] tracking-[0.06em] text-gray-500 uppercase">
          {lead.kicker}
        </div>
        <div className="dark:text-foreground mt-2.5 text-[clamp(48px,7vw,72px)] leading-[0.95] font-bold tracking-[-0.04em] text-gray-900 tabular-nums">
          {lead.value}
        </div>
        {lead.sub && (
          <div className="dark:text-muted-foreground mt-3.5 text-[14px] text-gray-600">
            {lead.sub}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2">
        {stats.slice(0, 4).map((s, i) => (
          <div
            key={s.k}
            className={cn(
              "dark:border-border border-gray-200 px-[22px] py-5",
              i % 2 === 0 && "border-r",
              i < 2 && "border-b",
            )}
          >
            <div className="dark:text-muted-foreground font-mono text-[10.5px] tracking-[0.05em] text-gray-500 uppercase">
              {s.k}
            </div>
            <div className="dark:text-foreground mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-gray-900 tabular-nums">
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- cohort badge */

const cohortStyles = {
  top: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  good: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  mid: "border-gray-300 bg-gray-100 text-gray-600 dark:border-border dark:bg-muted dark:text-muted-foreground",
} as const;

export function CohortBadge({
  tier = "top",
  icon,
  children,
  className,
}: {
  tier?: keyof typeof cohortStyles;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-[11px] py-1 text-[12.5px] font-semibold whitespace-nowrap [&_svg]:h-[13px] [&_svg]:w-[13px]",
        cohortStyles[tier],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- stat tiles */

export function StatTiles({
  items,
  className,
}: {
  items: {
    k: string;
    v: React.ReactNode;
    d?: React.ReactNode;
    trend?: "up" | "down";
  }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dark:border-border dark:bg-accent grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-4",
        className,
      )}
    >
      {items.map((t) => (
        <div key={t.k} className="dark:bg-card bg-white px-5 py-[18px]">
          <div className="dark:text-muted-foreground font-mono text-[10.5px] tracking-[0.05em] text-gray-500 uppercase">
            {t.k}
          </div>
          <div className="dark:text-foreground mt-[7px] text-[28px] font-bold tracking-[-0.03em] text-gray-900 tabular-nums">
            {t.v}
          </div>
          {t.d && (
            <div
              className={cn(
                "mt-[7px] text-[11.5px]",
                t.trend === "up"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : t.trend === "down"
                    ? "text-rose-600 dark:text-rose-400"
                    : "dark:text-muted-foreground text-gray-500",
              )}
            >
              {t.d}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
