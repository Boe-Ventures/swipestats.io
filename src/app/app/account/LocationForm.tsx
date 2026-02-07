"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountrySelect } from "@/components/ui/form-inputs/CountrySelect";
import { useTRPC } from "@/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContinentFromCountry } from "@/lib/utils/continent";
import { MapPin } from "lucide-react";

const locationSchema = z.object({
  timeZone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().length(2).optional(), // ISO-2 only
  region: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

export function LocationForm() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(trpc.user.me.queryOptions());

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      timeZone: "",
      city: "",
      country: "",
      region: "",
    },
  });

  const updateLocation = useMutation(
    trpc.user.updateLocation.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  const detectMutation = useMutation(
    trpc.user.detectLocation.mutationOptions({
      onSuccess: () => {
        // Invalidate user query to trigger refetch and update form
        void queryClient.invalidateQueries(trpc.user.me.queryOptions());
      },
    }),
  );

  // Load user data into form
  useEffect(() => {
    if (user) {
      form.reset({
        timeZone: user.timeZone ?? "",
        city: user.city ?? "",
        country: user.country ?? "",
        region: user.region ?? "",
      });
    }
  }, [user, form]);

  // Watch country for continent display
  const selectedCountry = form.watch("country");
  const continent = getContinentFromCountry(selectedCountry);

  const onSubmit = (data: LocationFormData) => {
    updateLocation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <p className="text-muted-foreground text-sm">
          Your location affects cohort comparisons and analytics. Update to
          compare with users in your region.
        </p>
        <CardAction>
          <Button
            type="button"
            onClick={() => detectMutation.mutate()}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={detectMutation.isPending}
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">
              {detectMutation.isPending ? "Detecting..." : "Detect Location"}
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Timezone */}
            <FormField
              control={form.control}
              name="timeZone"
              render={({ field }) => (
                <FormItem>
                  ok
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., America/New_York, Europe/London"
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Use IANA timezone format (e.g., America/New_York,
                    Europe/London)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Oslo, New York" />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    City name in English
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country - Use existing CountrySelect component */}
            <CountrySelect
              control={form.control}
              name="country"
              label="Country"
              placeholder="Select a country..."
            />

            {/* Continent - Read-only display */}
            <div className="space-y-2">
              <Label>Continent</Label>
              <Input value={continent || ""} disabled className="bg-muted" />
              <p className="text-muted-foreground text-xs">
                Auto-derived from country
              </p>
            </div>

            <Button type="submit" disabled={updateLocation.isPending}>
              {updateLocation.isPending ? "Saving..." : "Save Changes"}
            </Button>

            {updateLocation.isSuccess && (
              <p className="text-sm text-green-600">
                Location updated successfully!
              </p>
            )}
            {updateLocation.isError && (
              <p className="text-destructive text-sm">
                Error: {updateLocation.error.message}
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
