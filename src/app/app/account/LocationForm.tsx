"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function LocationForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const [timeZone, setTimeZone] = useState("");
  const [country, setCountry] = useState("");

  const updateLocation = useMutation(
    trpc.user.updateLocation.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  // Update local state when user data loads
  useEffect(() => {
    if (user) {
      setTimeZone(user.timeZone ?? "");
      setCountry(user.country ?? "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateLocation.mutate({
      timeZone: timeZone || undefined,
      country: country || undefined,
    });
  };

  // Detect browser timezone
  const detectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(detected);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="timeZone">Timezone</Label>
        <div className="flex gap-2">
          <Input
            id="timeZone"
            type="text"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            placeholder="e.g., America/New_York"
            className="flex-1"
          />
          <Button type="button" onClick={detectTimezone} variant="outline">
            Detect
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Use IANA timezone format (e.g., America/New_York, Europe/London)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="e.g., United States"
        />
      </div>

      <Button type="submit" disabled={updateLocation.isPending}>
        {updateLocation.isPending ? "Saving..." : "Save Changes"}
      </Button>

      {updateLocation.isSuccess && (
        <p className="text-sm text-green-600">Location updated successfully!</p>
      )}
      {updateLocation.isError && (
        <p className="text-destructive text-sm">
          Error: {updateLocation.error.message}
        </p>
      )}
    </form>
  );
}
