import { cn } from "@/components/ui/lib/utils";

/**
 * Golden PREMIUM-GATE primitives — the paywall dialect.
 * Consolidates the two prior patterns into one golden set:
 *  - LockedValue: blurs premium content behind the paywall (ports BlurredValue).
 *  - UpsellCard: the rose upsell card (golden re-skin of PremiumFeatureWrapper's
 *    upgrade CTA).
 * Server-safe (no hooks). Gating logic stays with the caller — these are pure
 * presentational shells.
 */

/* ---------------------------------------------------------------- locked value */

export function LockedValue({
  children,
  locked = true,
  className,
}: {
  children: React.ReactNode;
  locked?: boolean;
  className?: string;
}) {
  if (!locked) return <>{children}</>;

  return (
    <span
      className={cn(
        "pointer-events-none select-none opacity-70 blur-[5px]",
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- upsell card */

export function UpsellCard({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border border-rose-600/25 bg-rose-50 p-[18px] shadow-xs",
        className,
      )}
    >
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-rose-600 text-white [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold tracking-[-0.01em] text-gray-900">
          {title}
        </div>
        {description && (
          <div className="mt-0.5 text-[13.5px] leading-[1.5] text-gray-600">
            {description}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
