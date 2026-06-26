import { cn } from "@/components/ui/lib/utils";

/**
 * Golden FAQ accordion — native <details> with a plus→× chevron. Shared
 * across marketing pages (golden home; extract target for research / how-to,
 * which currently inline the same markup).
 */
export function FaqList({
  items,
  openFirst = true,
  className,
}: {
  items: { q: string; a: React.ReactNode }[];
  openFirst?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-gray-200", className)}>
      {items.map((item, i) => (
        <details
          key={item.q}
          open={openFirst && i === 0}
          className="group border-b border-gray-200"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-[22px] text-[16.5px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
            {item.q}
            <svg
              className="h-[22px] w-[22px] flex-none text-rose-600 transition-transform group-open:rotate-45"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <div className="max-w-[760px] pb-6 text-[14.5px] leading-[1.7] text-gray-600">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
