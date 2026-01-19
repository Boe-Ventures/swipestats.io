"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function DatingAppsForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const [activeOnTinder, setActiveOnTinder] = useState(false);
  const [activeOnHinge, setActiveOnHinge] = useState(false);
  const [activeOnBumble, setActiveOnBumble] = useState(false);
  const [activeOnHappn, setActiveOnHappn] = useState(false);
  const [activeOnOther, setActiveOnOther] = useState(false);
  const [otherApps, setOtherApps] = useState("");

  const updateDatingApps = useMutation(
    trpc.user.updateDatingApps.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  // Update local state when user data loads
  useEffect(() => {
    if (user) {
      setActiveOnTinder(user.activeOnTinder);
      setActiveOnHinge(user.activeOnHinge);
      setActiveOnBumble(user.activeOnBumble);
      setActiveOnHappn(user.activeOnHappn);
      setActiveOnOther(user.activeOnOther);
      setOtherApps(user.otherDatingApps?.join(", ") ?? "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDatingApps.mutate({
      activeOnTinder,
      activeOnHinge,
      activeOnBumble,
      activeOnHappn,
      activeOnOther,
      otherDatingApps: otherApps
        ? otherApps.split(",").map((app) => app.trim())
        : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="tinder">Tinder</Label>
          <Switch
            id="tinder"
            checked={activeOnTinder}
            onCheckedChange={setActiveOnTinder}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hinge">Hinge</Label>
          <Switch
            id="hinge"
            checked={activeOnHinge}
            onCheckedChange={setActiveOnHinge}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="bumble">Bumble</Label>
          <Switch
            id="bumble"
            checked={activeOnBumble}
            onCheckedChange={setActiveOnBumble}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="happn">Happn</Label>
          <Switch
            id="happn"
            checked={activeOnHappn}
            onCheckedChange={setActiveOnHappn}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="other">Other Apps</Label>
          <Switch
            id="other"
            checked={activeOnOther}
            onCheckedChange={setActiveOnOther}
          />
        </div>

        {activeOnOther && (
          <div className="space-y-2 pl-4">
            <Label
              htmlFor="otherApps"
              className="text-muted-foreground text-sm"
            >
              List other apps (comma-separated)
            </Label>
            <Input
              id="otherApps"
              type="text"
              value={otherApps}
              onChange={(e) => setOtherApps(e.target.value)}
              placeholder="e.g., OkCupid, Match, Feeld"
            />
          </div>
        )}
      </div>

      <Button type="submit" disabled={updateDatingApps.isPending}>
        {updateDatingApps.isPending ? "Saving..." : "Save Changes"}
      </Button>

      {updateDatingApps.isSuccess && (
        <p className="text-sm text-green-600">
          Dating apps updated successfully!
        </p>
      )}
      {updateDatingApps.isError && (
        <p className="text-destructive text-sm">
          Error: {updateDatingApps.error.message}
        </p>
      )}
    </form>
  );
}
