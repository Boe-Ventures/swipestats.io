import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UsernameFieldProps {
  username: string;
  onUsernameChange: (username: string) => void;
  disabled?: boolean;
  isChecking: boolean;
  isAvailable: boolean | null;
}

export function UsernameField({
  username,
  onUsernameChange,
  disabled,
  isChecking,
  isAvailable,
}: UsernameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="username" className="flex items-center gap-2">
        Username
        {isChecking && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking...
          </span>
        )}
        {!isChecking && isAvailable === false && (
          <span className="text-destructive flex items-center gap-1 text-xs">
            <XCircle className="h-3 w-3" />
            {username.includes("@") ? "@ symbols not allowed" : "Not available"}
          </span>
        )}
        {!isChecking && isAvailable === true && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Available!
          </span>
        )}
      </Label>
      <Input
        id="username"
        type="text"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        required
        minLength={3}
        maxLength={32}
        pattern="[^@]+"
        title="Username cannot contain @ symbols"
        placeholder="cooluser123"
        disabled={disabled}
        aria-invalid={isAvailable === false}
        className={
          isAvailable === false
            ? "border-destructive focus-visible:ring-destructive"
            : isAvailable === true
              ? "border-green-600 focus-visible:ring-green-600"
              : ""
        }
      />
    </div>
  );
}
