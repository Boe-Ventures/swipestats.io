"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ProfileForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const [name, setName] = useState(user?.name ?? "");
  const [displayUsername, setDisplayUsername] = useState(
    user?.displayUsername ?? "",
  );

  const updateProfile = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      name: name || undefined,
      displayUsername: displayUsername || undefined,
    });
  };

  // Update local state when user data loads
  if (user && name === "" && user.name) {
    setName(user.name);
  }
  if (user && displayUsername === "" && user.displayUsername) {
    setDisplayUsername(user.displayUsername);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayUsername">Display Username</Label>
        <Input
          id="displayUsername"
          type="text"
          value={displayUsername}
          onChange={(e) => setDisplayUsername(e.target.value)}
          placeholder="Your display username"
        />
      </div>

      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving..." : "Save Changes"}
      </Button>

      {updateProfile.isSuccess && (
        <p className="text-sm text-green-600">Profile updated successfully!</p>
      )}
      {updateProfile.isError && (
        <p className="text-destructive text-sm">
          Error: {updateProfile.error.message}
        </p>
      )}
    </form>
  );
}
