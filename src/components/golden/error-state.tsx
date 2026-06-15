import { cn } from "@/components/ui/lib/utils";

/**
 * Golden empty / error state — a centered column in the "golden" dialect
 * (white/gray surfaces, rose-600 accent, mono uppercase kicker). Use for 404s,
 * empty lists, and recoverable error screens. Server-safe (no hooks).
 *
 * @example
 * <ErrorState
 *   icon={<FileQuestion />}
 *   eyebrow="404"
 *   title="Page not found"
 *   message="The page may have moved or never existed."
 *   actions={<ButtonLink href="/">Back home</ButtonLink>}
 * />
 */
export function ErrorState({
  icon,
  eyebrow,
  title,
  message,
  actions,
  className,
}: {
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  message?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-20 text-center sm:py-28",
        className,
      )}
    >
      {icon && (
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 [&_svg]:size-7">
          {icon}
        </div>
      )}

      {eyebrow && (
        <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.12em] text-rose-600">
          {eyebrow}
        </div>
      )}

      <h1
        className={cn(
          "text-[clamp(28px,3.4vw,40px)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-gray-900",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </h1>

      {message && (
        <p className="mt-3.5 max-w-[44ch] text-[16px] leading-[1.6] text-gray-600">
          {message}
        </p>
      )}

      {actions && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {actions}
        </div>
      )}
    </div>
  );
}
