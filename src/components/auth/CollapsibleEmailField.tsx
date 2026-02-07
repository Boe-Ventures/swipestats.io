import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateUniqueAnonymousEmail } from "@/lib/utils/auth";

interface CollapsibleEmailFieldProps {
  email: string;
  onEmailChange: (email: string) => void;
  showEmailField: boolean;
  onShowEmailFieldChange: (show: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function CollapsibleEmailField({
  email,
  onEmailChange,
  showEmailField,
  onShowEmailFieldChange,
  disabled,
  children,
}: CollapsibleEmailFieldProps) {
  if (!showEmailField) {
    return (
      <div className="text-muted-foreground text-sm">
        <button
          type="button"
          onClick={() => onShowEmailFieldChange(true)}
          className="text-primary hover:underline"
        >
          Need password reset? Add a real email
        </button>
        <p className="mt-1 text-xs">
          Using temporary email for now. You can add a real one later in
          settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="email" className="text-sm">
        Email{" "}
        <span className="text-muted-foreground text-xs">
          (for password reset)
        </span>
      </Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="your.email@example.com"
        disabled={disabled}
        className="text-sm"
      />
      <button
        type="button"
        onClick={() => {
          onShowEmailFieldChange(false);
          onEmailChange(generateUniqueAnonymousEmail());
        }}
        className="text-muted-foreground text-xs hover:underline"
      >
        Use temporary email instead
      </button>
      {children}
    </div>
  );
}
