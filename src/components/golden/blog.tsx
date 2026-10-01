import { cn } from "@/components/ui/lib/utils";

/**
 * Golden BLOG primitives - editorial prose dialect. Ported from golden.css.
 * Server-safe. Use <Prose> to wrap MDX/article body, plus the inline callouts.
 */

/* ---------------------------------------------------------------- prose */

const proseClass = cn(
  "max-w-[720px] text-[17px] leading-[1.75] text-gray-700 dark:text-muted-foreground",
  "[&>*:first-child]:mt-0",
  "[&_h2]:mt-12 [&_h2]:text-[28px] [&_h2]:font-bold [&_h2]:leading-[1.15] [&_h2]:tracking-[-0.025em] [&_h2]:text-gray-950 dark:[&_h2]:text-foreground",
  "[&_h3]:mt-[34px] [&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:tracking-[-0.02em] [&_h3]:text-gray-950 dark:[&_h3]:text-foreground",
  "[&_p]:mt-[18px]",
  "[&_strong]:font-bold [&_strong]:text-gray-950 dark:[&_strong]:text-foreground",
  "[&_a]:font-semibold [&_a]:text-rose-600 [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-rose-400",
  "[&_ul]:mt-[18px] [&_ul]:flex [&_ul]:list-none [&_ul]:flex-col [&_ul]:gap-[11px] [&_ul]:pl-0",
  "[&_ul>li]:relative [&_ul>li]:pl-[26px]",
  "[&_ul>li]:before:absolute [&_ul>li]:before:left-[6px] [&_ul>li]:before:top-[11px] [&_ul>li]:before:h-[6px] [&_ul>li]:before:w-[6px] [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-rose-600 [&_ul>li]:before:content-['']",
  "[&_table]:mt-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-gray-200 [&_table]:text-[14.5px] dark:[&_table]:border-border",
  "[&_thead_th]:bg-gray-50 [&_thead_th]:px-4 [&_thead_th]:py-[11px] [&_thead_th]:text-left [&_thead_th]:font-mono [&_thead_th]:text-[11px] [&_thead_th]:font-medium [&_thead_th]:uppercase [&_thead_th]:tracking-[0.04em] [&_thead_th]:text-gray-500 dark:[&_thead_th]:bg-background dark:[&_thead_th]:text-muted-foreground",
  "[&_tbody_td]:border-t [&_tbody_td]:border-gray-200 [&_tbody_td]:px-4 [&_tbody_td]:py-[11px] dark:[&_tbody_td]:border-border",
);

export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(proseClass, className)}>{children}</div>;
}

/* ---------------------------------------------------------------- TL;DR callout */

export function Tldr({
  items,
  label = "TL;DR",
  className,
}: {
  items: React.ReactNode[];
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-rose-600/20 bg-rose-50 px-[26px] py-6 dark:bg-rose-950/40",
        className,
      )}
    >
      <div className="font-mono text-[11.5px] font-semibold tracking-[0.1em] text-rose-600 uppercase dark:text-rose-400">
        {label}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="dark:text-muted-foreground relative pl-[26px] text-[15px] leading-[1.55] text-gray-700"
          >
            <span className="absolute top-[9px] left-1 h-[7px] w-[7px] rounded-[2px] bg-rose-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- pull stat */

export function PullStat({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "my-8 border-l-[3px] border-rose-600 py-1 pl-[22px]",
        className,
      )}
    >
      <div className="dark:text-foreground text-[40px] leading-none font-bold tracking-[-0.03em] text-gray-900 tabular-nums">
        {value}
      </div>
      <div className="dark:text-muted-foreground mt-2 text-[14px] text-gray-600">
        {label}
      </div>
    </div>
  );
}
