"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Toast needs onClick handlers → a small client island. */
export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success("Insights are ready")}
      >
        success
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.error("Couldn't parse the file")}
      >
        error
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.info("Your export is processing")}
      >
        info
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.warning("Bumble can take up to 30 days")}
      >
        warning
      </Button>
      <Button variant="outline" size="sm" onClick={() => toast("Plain toast")}>
        default
      </Button>
    </div>
  );
}
