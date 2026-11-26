import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your SwipeStats password",
};

export default function ResetPasswordPage() {
  return (
    <div className="dark:bg-background flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="dark:text-foreground text-2xl font-bold text-gray-900">
              SwipeStats
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Reset Password
            </CardTitle>
            <p className="dark:text-muted-foreground text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="min-h-[300px]" />}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>

        <div className="dark:text-muted-foreground text-center text-xs text-gray-600">
          Remember your password?{" "}
          <Link
            href="/signin"
            className="text-rose-600 hover:text-rose-500 hover:underline dark:text-rose-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
