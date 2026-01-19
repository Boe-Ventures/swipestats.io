"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/server/better-auth/client";

export function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username availability checking
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Generate a unique anonymous email
  const generateUniqueAnonymousEmail = () => {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    return `guest-${timestamp}-${randomId}@anonymous.swipestats.io`;
  };

  // Initialize with anonymous email
  useEffect(() => {
    if (!showEmailField) {
      setEmail(generateUniqueAnonymousEmail());
    }
  }, [showEmailField]);

  // Debounced username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (username.length >= 3) {
        setCheckingUsername(true);
        try {
          const { data } = await authClient.isUsernameAvailable({ username });
          setUsernameAvailable(data?.available ?? false);
        } catch (err) {
          console.error("Username check error:", err);
          setUsernameAvailable(null);
        } finally {
          setCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!termsAccepted) {
      setError("You must accept the Terms of Service to continue");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name || "",
        username,
      });

      if (signUpError) {
        setError(signUpError.message ?? "Failed to create account");
      } else if (data) {
        router.push("/app/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.anonymous();

      if (error) {
        setError(error.message ?? "Failed to sign in anonymously");
      } else if (data) {
        router.push("/app/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">Create account</CardTitle>
        <p className="text-center text-sm text-gray-600">
          Get started with SwipeStats
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Username field with availability indicator */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              Username
              {checkingUsername && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking...
                </span>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" />
                  Not available
                </span>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Available!
                </span>
              )}
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              placeholder="cooluser123"
              disabled={isLoading}
              className={
                usernameAvailable === false
                  ? "border-red-600 focus-visible:ring-red-600"
                  : usernameAvailable === true
                    ? "border-green-600 focus-visible:ring-green-600"
                    : ""
              }
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">At least 8 characters</p>
          </div>

          {/* Name field (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-600">
              Name <span className="text-xs">(optional)</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
            />
          </div>

          {/* Email field (collapsible) */}
          {!showEmailField ? (
            <div className="text-sm text-gray-600">
              <button
                type="button"
                onClick={() => setShowEmailField(true)}
                className="text-rose-600 hover:text-rose-500 hover:underline"
              >
                Need password reset? Add a real email
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Using temporary email for now. You can add a real one later in
                settings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email{" "}
                <span className="text-xs text-gray-500">
                  (for password reset)
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={isLoading}
                className="text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowEmailField(false);
                  setEmail(generateUniqueAnonymousEmail());
                }}
                className="text-xs text-gray-500 hover:underline"
              >
                Use temporary email instead
              </button>
            </div>
          )}

          {/* Terms acceptance */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-gray-300 has-[:checked]:border-rose-600 has-[:checked]:bg-rose-50/50">
            <Checkbox
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5 shrink-0"
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm leading-none font-medium">
                I agree to the Terms and Conditions
              </p>
              <p className="text-xs leading-relaxed text-gray-600">
                By creating an account, you agree to our{" "}
                <Link
                  href="/tos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </label>

          <Button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-500"
            disabled={
              isLoading ||
              checkingUsername ||
              usernameAvailable === false ||
              !termsAccepted
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Create Account
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">
              or continue without account
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleAnonymousSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <UserCircle2 className="mr-2 h-4 w-4" />
              Continue as Guest
            </>
          )}
        </Button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-rose-600 hover:text-rose-500 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
