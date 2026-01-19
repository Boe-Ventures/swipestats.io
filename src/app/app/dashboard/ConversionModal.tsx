"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/server/better-auth/client";

interface ConversionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string; // Pre-fill email if provided (e.g., from newsletter signup)
}

const BENEFITS = [
  { icon: Check, text: "Keep all your saved profiles" },
  { icon: Users, text: "Access from any device" },
  { icon: Sparkles, text: "Unlock premium features" },
];

export function ConversionModal({
  open,
  onOpenChange,
  initialEmail,
}: ConversionModalProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<"create" | "signin">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique anonymous email for signup (different from current session email)
  // This prevents "email already exists" errors when upgrading anonymous accounts
  const generateUniqueAnonymousEmail = () => {
    // Use timestamp + random UUID for uniqueness
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    return `guest-${timestamp}-${randomId}@anonymous.swipestats.io`;
  };

  // Create account form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    initialEmail ?? generateUniqueAnonymousEmail(),
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailField, setShowEmailField] = useState(!!initialEmail);

  // Username availability checking
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Sign in form fields
  const [signinUsername, setSigninUsername] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
        username,
      });

      if (signUpError) {
        setError(signUpError.message ?? "Failed to create account");
        setIsLoading(false);
        return;
      }

      if (data) {
        // Better Auth automatically triggers onLinkAccount for anonymous users
        // Data transfer happens in the backend hook
        router.push("/app/dashboard");
        router.refresh();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Sign up error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during sign up",
      );
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await authClient.signIn.username({
        username: signinUsername,
        password: signinPassword,
      });

      if (signInError) {
        setError(signInError.message ?? "Failed to sign in");
        setIsLoading(false);
        return;
      }

      if (data) {
        // Better Auth automatically triggers onLinkAccount for anonymous users
        // Data transfer happens in the backend hook
        router.push("/app/dashboard");
        router.refresh();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during sign in",
      );
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setName("");
    setEmail(initialEmail ?? generateUniqueAnonymousEmail());
    setUsername("");
    setPassword("");
    setSigninUsername("");
    setSigninPassword("");
    setActiveTab("create");
    setUsernameAvailable(null);
    setCheckingUsername(false);
    setShowEmailField(!!initialEmail);
    onOpenChange(false);
  };

  return (
    <SimpleDialog
      open={open}
      onOpenChange={handleClose}
      title="Create a free account"
      description="Save your profiles and access them from any device"
      size="sm"
    >
      <div className="space-y-6 py-2">
        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Benefits list */}
        <div className="space-y-3">
          {BENEFITS.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                <benefit.icon className="h-4 w-4" />
              </div>
              <span className="text-muted-foreground text-sm">
                {benefit.text}
              </span>
            </div>
          ))}
        </div>

        {/* Tabs for Create Account / Sign In */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "create" | "signin")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Account</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>

          {/* Create Account Tab */}
          <TabsContent value="create" className="mt-4 space-y-4">
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* Username field with availability indicator */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  Username
                  {checkingUsername && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking...
                    </span>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <span className="text-destructive flex items-center gap-1 text-xs">
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
                  aria-invalid={usernameAvailable === false}
                  className={
                    usernameAvailable === false
                      ? "border-destructive focus-visible:ring-destructive"
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
              </div>

              {/* Name field (optional) */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">
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
                <div className="text-muted-foreground text-sm">
                  <button
                    type="button"
                    onClick={() => setShowEmailField(true)}
                    className="text-primary hover:underline"
                  >
                    Need password reset? Add a real email
                  </button>
                  <p className="mt-1 text-xs">
                    Using temporary email for now. You can add a real one later
                    in settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">
                    Email{" "}
                    <span className="text-muted-foreground text-xs">
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
                    className="text-muted-foreground text-xs hover:underline"
                  >
                    Use temporary email instead
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading || checkingUsername || usernameAvailable === false
                }
              >
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="mt-4 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-username">Username</Label>
                <Input
                  id="signin-username"
                  type="text"
                  value={signinUsername}
                  onChange={(e) => setSigninUsername(e.target.value)}
                  required
                  placeholder="cooluser123"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Skip option */}
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground w-full text-center text-sm underline-offset-4 hover:underline"
        >
          Maybe later
        </button>
      </div>
    </SimpleDialog>
  );
}
