"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/form-new";
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
        <Field orientation="horizontal">
          <FieldLabel htmlFor="tinder">Tinder</FieldLabel>
          <Switch
            id="tinder"
            checked={activeOnTinder}
            onCheckedChange={setActiveOnTinder}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="hinge">Hinge</FieldLabel>
          <Switch
            id="hinge"
            checked={activeOnHinge}
            onCheckedChange={setActiveOnHinge}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="bumble">Bumble</FieldLabel>
          <Switch
            id="bumble"
            checked={activeOnBumble}
            onCheckedChange={setActiveOnBumble}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="happn">Happn</FieldLabel>
          <Switch
            id="happn"
            checked={activeOnHappn}
            onCheckedChange={setActiveOnHappn}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="other">Other Apps</FieldLabel>
          <Switch
            id="other"
            checked={activeOnOther}
            onCheckedChange={setActiveOnOther}
          />
        </Field>

        {activeOnOther && (
          <div className="space-y-2 pl-4">
            <Field>
              <FieldLabel
                htmlFor="otherApps"
                className="text-muted-foreground text-sm"
              >
                List other apps (comma-separated)
              </FieldLabel>
              <Input
                id="otherApps"
                type="text"
                value={otherApps}
                onChange={(e) => setOtherApps(e.target.value)}
                placeholder="e.g., OkCupid, Match, Feeld"
              />
            </Field>
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
