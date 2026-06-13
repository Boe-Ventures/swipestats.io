import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/ui/lib/utils";

/**
 * Shared presentational primitives for the redesigned marketing pages
 * (/research, /how-to-request-your-data) — one source of truth for the
 * handoff design system: Inter + Geist Mono, rose-600 on cool gray,
 * the rose eyebrow rule, section heads, the graph-paper hero texture, and
 * the CTA button. Pure/server-safe — usable from server or client components.
 */

/* ------------------------------------------------------------------ button */

export const marketingButton = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold tracking-[-0.01em] whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-rose-600 text-white shadow-[0_1px_2px_oklch(0.5_0.2_17/0.3),0_12px_28px_oklch(0.5_0.2_17/0.22)] hover:-translate-y-px hover:bg-rose-700",
        ghost:
          "border border-gray-300 bg-white text-gray-900 shadow-xs hover:-translate-y-px hover:border-gray-400",
        white: "bg-white text-gray-900 hover:bg-gray-100",
        // colour + background supplied inline (e.g. per-provider brand colours)
        bare: "text-white hover:-translate-y-px",
      },
      size: {
        default: "px-[18px] py-[11px] text-[15px]",
        lg: "px-[22px] py-[13px] text-[16px]",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type MarketingButtonProps = VariantProps<typeof marketingButton>;

/* ------------------------------------------------------------------ eyebrow */

export function Eyebrow({
  children,
  center,
  noRule,
  className,
}: {
  children: React.ReactNode;
  center?: boolean;
  noRule?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[12.5px] font-medium uppercase tracking-[0.12em] text-rose-600",
        center && "justify-center",
        className,
      )}
    >
      {!noRule && (
        <span className="h-px w-[18px] bg-rose-600 opacity-50" aria-hidden />
      )}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ section head */

export function SectionHead({
  eyebrow,
  title,
  lead,
  center,
  className,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-[680px]", center && "mx-auto text-center", className)}>
      <Eyebrow center={center} noRule={center}>
        {eyebrow}
      </Eyebrow>
      <h2 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-gray-900">
        {title}
      </h2>
      {lead && (
        <p className="mt-[18px] text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
          {lead}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ hero grid texture */

export function GridBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(to_right,var(--color-gray-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gray-200)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(120%_90%_at_80%_0%,#000,transparent_70%)]"
    />
  );
}
