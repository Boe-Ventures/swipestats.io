"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Controller,
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/form-new";
import { Input } from "@/components/ui/input";

const locationFormSchema = z.object({
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  country: z
    .string()
    .min(2, "Country code required")
    .max(2, "Use 2-letter code"),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  initialLocation?: {
    city?: string;
    region?: string;
    country?: string;
  };
  onSubmit: (data: LocationFormValues) => void;
  onCancel?: () => void;
}

export function LocationForm({
  initialLocation,
  onSubmit,
  onCancel,
}: LocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      city: initialLocation?.city ?? "",
      region: initialLocation?.region ?? "",
      country: initialLocation?.country ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
      <Controller
        control={form.control}
        name="city"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>City</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Oslo"
              className="min-h-[44px] sm:min-h-0"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="region"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Region/State</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Oslo"
              className="min-h-[44px] sm:min-h-0"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="country"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Country (2-letter code)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="NO"
              maxLength={2}
              className="min-h-[44px] uppercase sm:min-h-0"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="min-h-[44px] sm:min-h-0"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" className="min-h-[44px] flex-1 sm:min-h-0">
          Save Location
        </Button>
      </div>
    </form>
  );
}
