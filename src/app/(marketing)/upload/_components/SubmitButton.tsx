"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui";
import type { ReactNode } from "react";

interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export function SubmitButton({
  onClick,
  disabled,
  isLoading,
  children,
  className,
}: SubmitButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="lg"
      className={cn("min-h-[48px] w-full text-base sm:min-h-0", className)}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
