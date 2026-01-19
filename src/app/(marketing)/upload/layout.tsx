"use client";

import { usePathname } from "next/navigation";
import { UploadStepper } from "./_components/UploadStepper";

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine current step based on pathname
  let currentStep: 1 | 2 | 3 = 1;
  if (
    pathname.startsWith("/upload/tinder") ||
    pathname.startsWith("/upload/hinge")
  ) {
    currentStep = 2;
  } else if (pathname.startsWith("/insights")) {
    currentStep = 3;
  }

  // Check if we're on a provider page (needs wider container)
  const isProviderPage =
    pathname.startsWith("/upload/tinder") ||
    pathname.startsWith("/upload/hinge");

  return (
    <div className="min-h-screen bg-white">
      {/* Stepper - container width depends on page type */}
      <div
        className={
          isProviderPage
            ? "mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8"
            : "mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8"
        }
      >
        <UploadStepper currentStep={currentStep} />
      </div>

      {/* Page Content - pages handle their own containers */}
      {children}
    </div>
  );
}
