"use client";

import { Children, isValidElement, useState } from "react";
import { cn } from "@/components/ui/lib/utils";

type PanelProps = { id: string; label: string; children: React.ReactNode };

/** Marker — Tabs reads its props; the body is rendered by Tabs, not here. */
export function TabPanel({ children }: PanelProps) {
  return <>{children}</>;
}

export function Tabs({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const panels = Children.toArray(children).filter(
    isValidElement,
  ) as React.ReactElement<PanelProps>[];

  const [active, setActive] = useState(panels[0]?.props.id ?? "");

  return (
    <div className={className}>
      <div
        role="tablist"
        className="sticky top-[57px] z-40 -mx-6 mb-12 flex flex-wrap gap-2 border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur"
      >
        {panels.map((p) => {
          const isActive = p.props.id === active;
          return (
            <button
              key={p.props.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(p.props.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition",
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {p.props.label}
            </button>
          );
        })}
      </div>

      {panels.map((p) => (
        <div
          key={p.props.id}
          // display:none (inline) keeps inactive panels mounted so client
          // components don't lose state when switching tabs.
          style={{ display: p.props.id === active ? undefined : "none" }}
          className="flex flex-col gap-16"
        >
          {p.props.children}
        </div>
      ))}
    </div>
  );
}
