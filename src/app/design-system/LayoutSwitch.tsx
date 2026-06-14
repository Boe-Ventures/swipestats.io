"use client";

import { Children, useState } from "react";
import {
  Bars3Icon,
  Squares2X2Icon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";

type Layout = "stack" | "grid" | "scroll";

const OPTIONS: { id: Layout; label: string; Icon: typeof Bars3Icon }[] = [
  { id: "stack", label: "Stack", Icon: Bars3Icon },
  { id: "grid", label: "Grid", Icon: Squares2X2Icon },
  { id: "scroll", label: "Scroll", Icon: ArrowsRightLeftIcon },
];

/**
 * Per-section layout toggle: render the children stacked (full-width),
 * in a 2-up grid, or in a horizontal-scroll track. Lets each section pick
 * what reads best — wide components stack, small ones grid, dense compares
 * scroll.
 */
export function LayoutSwitch({
  children,
  defaultLayout = "grid",
}: {
  children: React.ReactNode;
  defaultLayout?: Layout;
}) {
  const [layout, setLayout] = useState<Layout>(defaultLayout);

  const container = {
    stack: "flex flex-col gap-5",
    grid: "grid grid-cols-1 gap-5 lg:grid-cols-2",
    scroll: "flex gap-5 overflow-x-auto pb-3 [scroll-snap-type:x_mandatory]",
  }[layout];

  const item =
    layout === "scroll"
      ? "min-w-[min(92%,720px)] shrink-0 [scroll-snap-align:start]"
      : "min-w-0";

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {OPTIONS.map((o) => {
          const active = o.id === layout;
          return (
            <button
              key={o.id}
              onClick={() => setLayout(o.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-semibold transition",
                active
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <o.Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          );
        })}
      </div>
      <div className={container}>
        {Children.map(children, (child, i) => (
          <div key={i} className={item}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
