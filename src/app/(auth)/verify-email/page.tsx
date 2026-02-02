"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const trpc = useTRPC();
  const hasAttemptedRef = useRef(false);

  const [countdown, setCountdown] = useState(5);

  // Check if user is anonymous (Better Auth will also check server-side)
  const { data: user } = useQuery(trpc.user.me.queryOptions());
  const isAnonymous = user?.isAnonymous ?? false;

  const verifyEmail = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.verifyEmail({
        query: { token },
      });
      if (error) throw new Error(error.message);
      return { message: "Email verified successfully!" };
    },
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
  });

  useEffect(() => {
    // Only attempt verification once
    // Better Auth handles anonymous user checks server-side
    if (token && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      verifyEmail.mutate(token);
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
        ) : isAnonymous ? (
          <div className="space-y-4 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-yellow-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Create an Account First
              </h3>
              <p className="text-gray-600">
                You need to create a real account before verifying your email.
                Anonymous accounts cannot verify email addresses.
              </p>
            </div>
            <Button
              onClick={() => router.push("/app/dashboard")}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Go to Dashboard
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
