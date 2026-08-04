"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTRPC } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/server/better-auth/client";

export function DeleteAccountButton() {
  const trpc = useTRPC();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = useMutation(
    trpc.user.delete.mutationOptions({
      onSuccess: async () => {
        // Sign out after successful deletion. Hard navigation, not
        // router.push: it drops the whole JS heap (React Query cache
        // included), so nothing of this account's data lingers client-side.
        await authClient.signOut();
        window.location.href = "/";
      },
    }),
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount.mutateAsync();
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" disabled={isDeleting}>
            Delete Account
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. It permanently deletes your SwipeStats
            account and uploaded product data, including:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Your profile information</li>
              <li>All Tinder and Hinge profiles</li>
              <li>All matches and messages</li>
              <li>All media and statistics</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Yes, delete my account"}
          </AlertDialogAction>
        </AlertDialogFooter>
        {deleteAccount.isError && (
          <p className="text-destructive text-sm">
            Error: {deleteAccount.error.message}
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
