import { FileQuestion } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-full">
            <FileQuestion className="size-10" />
          </div>
        </div>

        <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
          Page Not Found
        </h1>

        <p className="text-muted-foreground mt-6 text-lg leading-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The
          page may have been moved, deleted, or the URL might be incorrect.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <ButtonLink href="/" variant="default">
            Go Home
          </ButtonLink>
          <ButtonLink href="/upload" variant="outline">
            Upload Your Data
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
