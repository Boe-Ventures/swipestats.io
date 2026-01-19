"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/components/ui/lib/utils";

interface HingeTermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function HingeTermsCheckbox({
  checked,
  onCheckedChange,
}: HingeTermsCheckboxProps) {
  return (
    <label
      htmlFor="terms-checkbox"
      className={cn(
        "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 has-[*[data-state=checked]]:border-primary has-[*[data-state=checked]]:bg-primary/5 has-[*[data-state=checked]]:ring-primary/20 relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 shadow-sm transition-all focus-within:ring-[3px] has-[*[data-state=checked]]:ring-[3px] has-[:checked]:ring-[3px]",
      )}
    >
      <Checkbox
        id="terms-checkbox"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm leading-none font-medium">
          I agree to the Terms and Conditions
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          By uploading your data, you agree to our{" "}
          <a
            href="/tos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Terms and Conditions
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </label>
  );
}
