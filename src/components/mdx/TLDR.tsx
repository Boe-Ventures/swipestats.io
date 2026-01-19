import type React from "react";

interface TLDRProps {
  children: React.ReactNode;
}

export function TLDR({ children }: TLDRProps) {
  return (
    <div className="border-border/60 bg-background/15 mb-8 max-w-3xl rounded-lg border shadow-md backdrop-blur-md">
      <div className="flex p-6">
        <div className="prose lg:prose-lg max-w-none text-slate-700 [&_h3]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:text-slate-700 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:my-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
