import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your SwipeStats account and start analyzing your dating profile.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">SwipeStats</span>
          </Link>
        </div>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}
