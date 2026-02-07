"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/server/better-auth/client";
import { generateUniqueAnonymousEmail } from "@/lib/utils/auth";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import { UsernameField } from "@/components/auth/UsernameField";
import { CollapsibleEmailField } from "@/components/auth/CollapsibleEmailField";

export function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAvailable: usernameAvailable, isChecking: checkingUsername } =
    useUsernameAvailability(username);

  // Initialize with anonymous email
  useEffect(() => {
    if (!showEmailField) {
      setEmail(generateUniqueAnonymousEmail());
    }
  }, [showEmailField]);

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
    setIsAnonymousLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.anonymous(
        {
          fetchOptions: {
            headers: {
              "X-Anonymous-Source": "direct",
            },
          },
        },
        undefined, // query params
      );

      if (error) {
        setError(error.message ?? "Failed to sign in anonymously");
      } else if (data) {
        router.push("/app/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnonymousLoading(false);
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
          <UsernameField
            username={username}
            onUsernameChange={setUsername}
            disabled={isLoading}
            isChecking={checkingUsername}
            isAvailable={usernameAvailable}
          />

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

          <CollapsibleEmailField
            email={email}
            onEmailChange={setEmail}
            showEmailField={showEmailField}
            onShowEmailFieldChange={setShowEmailField}
            disabled={isLoading}
          />

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
          disabled={isAnonymousLoading}
        >
          {isAnonymousLoading ? (
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
