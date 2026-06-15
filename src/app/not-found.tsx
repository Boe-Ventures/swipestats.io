import { FileQuestion } from "lucide-react";

import { ErrorState } from "@/components/golden/error-state";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <ErrorState
        icon={<FileQuestion />}
        eyebrow="404"
        title="Page not found"
        message="We couldn't find the page you're looking for. It may have been moved, deleted, or the URL might be incorrect."
        actions={
          <>
            <ButtonLink href="/" variant="default">
              Back home
            </ButtonLink>
            <ButtonLink href="/research" variant="ghost">
              Explore research
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
