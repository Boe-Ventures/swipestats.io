"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { cn } from "./lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { toast } from "./toast";

export interface CopyableFieldProps {
  /** The value to display and copy */
  value: string;
  /** Toast message to show on successful copy */
  successMessage?: string;
  /** Toast message to show on copy failure */
  errorMessage?: string;
  /** Callback called when copy is successful */
  onCopy?: () => void;
  /** Callback called when copy fails */
  onCopyError?: (error: Error) => void;
  /** Visual variant */
  variant?: "default" | "highlighted";
  /** Font style for the value */
  fontStyle?: "normal" | "mono";
  /** Additional CSS classes for the container */
  className?: string;
}

export function CopyableField({
  value,
  successMessage = "Copied to clipboard!",
  errorMessage = "Failed to copy",
  onCopy,
  onCopyError,
  variant = "default",
  fontStyle = "mono",
  className = "",
}: CopyableFieldProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onCopy?.();
      toast.success(successMessage);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Copy failed");
      onCopyError?.(err);
      toast.error(errorMessage);
    }
  };

  const copyInputClasses = {
    default: "pr-20",
    highlighted: "rounded border border-blue-300 bg-white",
  };

  return (
    <div className="relative">
      <Input
        value={value}
        readOnly
        className={cn(
          copyInputClasses[variant],
          fontStyle === "mono" ? "font-mono" : "",
          "pr-20 text-sm",
          className,
          "bg-muted/50 pr-20 font-mono text-xs",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute top-1/2 right-1 h-8 -translate-y-1/2 px-2 text-xs"
      >
        <Copy className="mr-1 h-3 w-3" />
        {copySuccess ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
