"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

interface AnonymousNamePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnonymousNamePrompt({
  open,
  onOpenChange,
  onSuccess,
}: AnonymousNamePromptProps) {
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const updateName = useMutation(
    trpc.profileCompare.updateAnonymousUserName.mutationOptions({
      onSuccess: () => {
        toast.success("Welcome! You can now view and comment.");
        setName("");
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to set your name");
        setIsCreatingSession(false);
      },
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter your name");
      return;
    }

    setIsCreatingSession(true);

    try {
      // Step 1: Create anonymous session
      const sessionResult = await authClient.signIn.anonymous({
        fetchOptions: {
          headers: {
            "X-Anonymous-Source": "comparison_view",
          },
        },
      });
      if (sessionResult.error) {
        throw new Error(
          sessionResult.error.message || "Failed to create session",
        );
      }

      // Step 2: Update user name
      updateName.mutate({ name: trimmedName });
    } catch (err) {
      console.error("Auth error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setIsCreatingSession(false);
    }
  };

  const isLoading = isCreatingSession || updateName.isPending;

  return (
    // Deliberately non-dismissable: every visitor on a share page has a named
    // session, so feedback surfaces never have to handle "unauthenticated".
    // Close attempts (X, escape, outside click) are ignored — the only way
    // through is submitting a name, which closes via the success path above.
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>What should we call you?</DialogTitle>
          <DialogDescription>
            Add a name to view and comment. It appears next to any feedback you
            leave.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                disabled={isLoading}
                autoFocus
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
