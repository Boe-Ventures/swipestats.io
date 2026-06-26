import { Loader2Icon } from "lucide-react";
import type * as React from "react";

import { cn } from "./lib/utils";

/**
 * Spinner — the canonical loading indicator (shadcn spec).
 *
 * Compose it inside a Button to show a loading state. Add
 * `data-icon="inline-start"` (or `"inline-end"`) so it gets the right spacing:
 *
 * @example
 * <Button>
 *   <Spinner data-icon="inline-start" />
 *   Saving…
 * </Button>
 */
function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof Loader2Icon>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
