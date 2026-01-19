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
      const sessionResult = await authClient.signIn.anonymous();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What should we call you?</DialogTitle>
          <DialogDescription>
            Enter your name to view and comment on this comparison.
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
