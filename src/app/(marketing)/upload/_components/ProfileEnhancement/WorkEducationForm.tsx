"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Software Engineer"
                    className="min-h-[44px] sm:min-h-0"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Your current or most recent job title
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Acme Inc"
                    className="min-h-[44px] sm:min-h-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School/University</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="University of Oslo"
                    className="min-h-[44px] sm:min-h-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
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
    </Form>
  );
}
