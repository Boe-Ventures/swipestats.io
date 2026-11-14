import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ConsentForm } from "./ConsentForm";

export const metadata: Metadata = {
  title: "Authorize SwipeStats",
  description: "Grant an application access to your SwipeStats workspace.",
  robots: { index: false, follow: false },
};

export default function ConsentPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Link href="/" className="text-xl font-bold">
            SwipeStats
          </Link>
        </div>
        <Suspense fallback={<div className="min-h-80" />}>
          <ConsentForm />
        </Suspense>
      </div>
    </div>
  );
}
