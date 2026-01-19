"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const trpc = useTRPC();

  const [countdown, setCountdown] = useState(5);

  const verifyEmail = useMutation(
    trpc.user.verifyEmail.mutationOptions({
      onSuccess: () => {
        // Start countdown to redirect
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              router.push("/app/account");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
    }),
  );

  useEffect(() => {
    if (token) {
      verifyEmail.mutate({ token });
    }
  }, [token, verifyEmail]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-gray-900">
          Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!token ? (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Invalid Link
              </h3>
              <p className="text-gray-600">
                No verification token found. Please check your email for the
                correct link.
              </p>
            </div>
            <Button
              onClick={() => router.push("/app/account")}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Go to Account Settings
            </Button>
          </div>
        ) : verifyEmail.isPending ? (
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-rose-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Verifying your email...
              </h3>
              <p className="text-gray-600">Please wait a moment.</p>
            </div>
          </div>
        ) : verifyEmail.isSuccess ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Email Verified!
              </h3>
              <p className="text-gray-600">
                {verifyEmail.data?.message ||
                  "Your email has been verified successfully."}
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to account settings in {countdown} seconds...
              </p>
            </div>
            <Button
              onClick={() => router.push("/app/account")}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Go to Account Settings Now
            </Button>
          </div>
        ) : verifyEmail.isError ? (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Verification Failed
              </h3>
              <p className="text-gray-600">
                {verifyEmail.error?.message ||
                  "Unable to verify your email. The link may be expired or invalid."}
              </p>
            </div>
            <Button
              onClick={() => router.push("/app/account")}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Go to Account Settings
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-gray-900">
                Email Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-center">
                <Loader2 className="mx-auto h-16 w-16 animate-spin text-rose-600" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Loading...
                  </h3>
                  <p className="text-gray-600">Please wait a moment.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
