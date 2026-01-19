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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareKey: string;
  selectedPhotos: string[];
  onSuccess: () => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  shareKey,
  selectedPhotos,
  onSuccess,
}: PublishDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const createColumnMutation = useMutation(
    trpc.profileCompare.createFriendColumn.mutationOptions({
      onSuccess: () => {
        toast.success("Your profile version has been published!");
        setName("");
        setIsCreatingSession(false);
        onOpenChange(false);
        void queryClient.invalidateQueries(
          trpc.profileCompare.getPublic.queryOptions({ shareKey }),
        );
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to publish column");
        setIsCreatingSession(false);
      },
    }),
  );

  const updateNameMutation = useMutation(
    trpc.profileCompare.updateAnonymousUserName.mutationOptions({
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

    if (selectedPhotos.length === 0) {
      toast.error("Please select at least one photo");
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
      await updateNameMutation.mutateAsync({ name: trimmedName });

      // Step 3: Create column with auto-generated label from name
      const columnLabel = `${trimmedName}'s Version`;
      await createColumnMutation.mutateAsync({
        shareKey,
        columnLabel,
        photoAttachmentIds: selectedPhotos,
      });
    } catch (err) {
      console.error("Publish error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setIsCreatingSession(false);
    }
  };

  const isLoading =
    isCreatingSession ||
    updateNameMutation.isPending ||
    createColumnMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Your Version</DialogTitle>
          <DialogDescription>
            Enter your name to publish your version of this profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
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
            <p className="text-muted-foreground text-xs">
              You're creating an anonymous account. Your name will only be
              visible to the profile owner. Your version will be named "
              {name.trim() || "Your"}'s Version".
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
