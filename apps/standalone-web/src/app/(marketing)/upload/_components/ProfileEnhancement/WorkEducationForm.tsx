"use client";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Controller,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/form-new";
import { Input } from "@/components/ui/input";

const workEducationFormSchema = z.object({
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  school: z.string().optional(),
});

type WorkEducationFormValues = z.infer<typeof workEducationFormSchema>;

interface WorkEducationFormProps {
  initialData?: {
    jobTitle?: string;
    company?: string;
    school?: string;
  };
  onSubmit: (data: WorkEducationFormValues) => void;
  onSkip?: () => void;
}

export function WorkEducationForm({
  initialData,
  onSubmit,
  onSkip,
}: WorkEducationFormProps) {
  const form = useForm<WorkEducationFormValues>({
    resolver: zodResolver(workEducationFormSchema),
    defaultValues: {
      jobTitle: initialData?.jobTitle ?? "",
      company: initialData?.company ?? "",
      school: initialData?.school ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
      <div className="space-y-4">
        <Controller
          control={form.control}
          name="jobTitle"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Job Title</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Software Engineer"
                className="min-h-[44px] sm:min-h-0"
              />
              <FieldDescription className="text-xs">
                Your current or most recent job title
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="company"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Company</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Acme Inc"
                className="min-h-[44px] sm:min-h-0"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="school"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>School/University</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="University of Oslo"
                className="min-h-[44px] sm:min-h-0"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onSkip && (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="min-h-[44px] sm:min-h-0"
          >
            Skip for now
          </Button>
        )}
        <Button type="submit" className="min-h-[44px] flex-1 sm:min-h-0">
          Save
        </Button>
      </div>
    </form>
  );
}
