import { cn } from "@/components/ui/lib/utils";
import { Eyebrow } from "./marketing-ui";

/**
 * The dark rose-glow call-to-action band. Shared across marketing pages
 * (golden home final CTA; extract target for research / how-to). Pass the
 * action buttons as children-style `actions` so the caller controls them.
 */
export function CtaBand({
  eyebrow,
  title,
  lead,
  actions,
  center,
  glow = "top-right",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  center?: boolean;
  glow?: "top-right" | "bottom-left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] bg-gray-950 p-16 text-gray-100 max-[720px]:p-8",
        center && "text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute h-[720px] w-[720px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]",
          glow === "top-right"
            ? "-top-[220px] -right-[140px]"
            : "-bottom-[240px] -left-[120px]",
        )}
      />
      <div className={cn("relative", center ? "mx-auto max-w-[600px]" : "max-w-[620px]")}>
        {eyebrow && (
          <Eyebrow noRule className={cn("text-rose-500", center && "justify-center")}>
            {eyebrow}
          </Eyebrow>
        )}
        <h2
          className={cn(
            "text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-white",
            eyebrow && "mt-3.5",
          )}
        >
          {title}
        </h2>
        {lead && (
          <p
            className={cn(
              "mt-4 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-400",
              center && "mx-auto max-w-[520px]",
            )}
          >
            {lead}
          </p>
        )}
        {actions && (
          <div
            className={cn(
              "mt-7 flex flex-wrap gap-3.5",
              center && "justify-center",
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
