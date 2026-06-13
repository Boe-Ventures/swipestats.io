import { cn } from "@/components/ui/lib/utils";

/**
 * Shared presentational primitives for the "How to request your data" page,
 * mirroring the SwipeStats research design system (Inter + Geist Mono,
 * rose-600 on cool gray, max-w-7xl rhythm). Pure/server-safe — usable from
 * both server and client components.
 */

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap transition";
export const btnPrimary =
  "bg-rose-600 text-white shadow-[0_1px_2px_oklch(0.5_0.2_17/0.3),0_12px_28px_oklch(0.5_0.2_17/0.22)] hover:-translate-y-px hover:bg-rose-700";
export const btnGhost =
  "border border-gray-300 bg-white text-gray-900 shadow-xs hover:-translate-y-px hover:border-gray-400";
export const btnWhite = "bg-white text-gray-900 hover:bg-gray-100";
export const btnPadding = "px-[18px] py-[11px]";
export const btnLg = "px-[22px] py-[13px] text-[16px]";

export function Eyebrow({
  children,
  noRule,
  className,
}: {
  children: React.ReactNode;
  noRule?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[12.5px] font-medium uppercase tracking-[0.12em] text-rose-600",
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

export function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-[680px]">
      <Eyebrow>{eyebrow}</Eyebrow>
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

export function GridBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:linear-gradient(to_right,var(--color-gray-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gray-200)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(120%_90%_at_80%_0%,#000,transparent_70%)]"
    />
  );
}
