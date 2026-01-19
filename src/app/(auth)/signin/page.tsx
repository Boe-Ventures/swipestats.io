import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your SwipeStats account to access your insights.",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">SwipeStats</span>
          </Link>
        </div>

        <Suspense fallback={<div className="min-h-[400px]" />}>
          <SignInForm />
        </Suspense>

        <div className="text-center text-xs text-gray-600">
          By continuing, you agree to our{" "}
          <Link href="/tos" className="underline hover:text-gray-900">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-gray-900">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
