"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function EmailVerificationForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const [newEmail, setNewEmail] = useState("");
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const isAnonymousEmail = user?.email?.includes("@anonymous.swipestats.io");
  const isVerified = user?.emailVerified;

  const updateEmail = useMutation(
    trpc.user.updateEmail.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
        setNewEmail("");
        setShowUpdateForm(false);
      },
    }),
  );

  const sendVerificationEmail = useMutation(
    trpc.user.sendVerificationEmail.mutationOptions(),
  );

  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail) {
      updateEmail.mutate({ email: newEmail });
    }
  };

  const handleSendVerification = () => {
    sendVerificationEmail.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Current Email Status */}
      <div className="space-y-2">
        <Label>Current Email</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="bg-muted rounded px-2 py-1 text-sm break-all">
            {user?.email}
          </code>
          {isVerified ? (
            <div className="flex shrink-0 items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Verified
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1 text-xs text-yellow-600">
              <ShieldCheck className="h-4 w-4" />
              Not Verified
            </div>
          )}
        </div>
      </div>

      {/* Anonymous Email Warning */}
      {isAnonymousEmail && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Temporary Email Detected</strong>
            <p className="mt-1 text-sm">
              You're using a temporary email. Add a real email address to enable
              password reset functionality.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Status & Actions */}
      {!isVerified && !isAnonymousEmail && (
        <div className="space-y-3">
          <Alert variant="info">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Your email is not verified yet. Verify it to enable password
              reset.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSendVerification}
            disabled={sendVerificationEmail.isPending}
            variant="outline"
            className="w-full"
          >
            {sendVerificationEmail.isPending
              ? "Sending..."
              : "Send Verification Email"}
          </Button>

          {sendVerificationEmail.isSuccess && (
            <p className="text-sm text-green-600">
              {sendVerificationEmail.data?.message || "Check your inbox!"}
            </p>
          )}

          {sendVerificationEmail.isError && (
            <p className="text-destructive text-sm">
              Error: {sendVerificationEmail.error.message}
            </p>
          )}
        </div>
      )}

      {/* Update Email Form */}
      <div className="space-y-3 border-t pt-2">
        {!showUpdateForm ? (
          <Button
            onClick={() => setShowUpdateForm(true)}
            variant="outline"
            className="w-full"
          >
            {isAnonymousEmail ? "Add Real Email" : "Update Email"}
          </Button>
        ) : (
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-email">
                {isAnonymousEmail ? "New Email Address" : "Update Email"}
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <p className="text-muted-foreground text-xs">
                You'll need to verify the new email address.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={updateEmail.isPending}
                className="flex-1"
              >
                {updateEmail.isPending ? "Updating..." : "Update Email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUpdateForm(false);
                  setNewEmail("");
                }}
              >
                Cancel
              </Button>
            </div>

            {updateEmail.isSuccess && (
              <p className="text-sm text-green-600">
                Email updated successfully!
              </p>
            )}
            {updateEmail.isError && (
              <p className="text-destructive text-sm">
                Error: {updateEmail.error.message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
