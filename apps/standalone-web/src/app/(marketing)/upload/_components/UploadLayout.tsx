"use client";

import { cn } from "@/components/ui";
import type { ReactNode } from "react";

interface UploadLayoutProps {
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  className?: string;
}

export function UploadLayout({
  leftColumn,
  rightColumn,
  className,
}: UploadLayoutProps) {
  return (
    <div className={cn("min-h-screen", className)}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left Column - Upload controls and enhancements */}
          <div className="space-y-6">{leftColumn}</div>

          {/* Right Column - Preview */}
          {rightColumn && (
            <div className="lg:sticky lg:top-6 lg:h-fit">{rightColumn}</div>
          )}
        </div>
      </div>
    </div>
  );
}
