"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { isGenderDataUnknown } from "@/lib/utils/gender";

// Simplified gender options for the UI (merges "Other" and "More")
const GENDER_OPTIONS = ["M", "F", "Other"] as const;

const genderFormSchema = z.object({
  gender: z.enum(["M", "F", "Other"]),
  genderFilter: z.enum(["M", "F", "Other"]),
  interestedIn: z.enum(["M", "F", "Other"]),
});

type GenderFormValues = z.infer<typeof genderFormSchema>;

interface GenderFormProps {
  currentGender?: string;
  currentInterestedIn?: string;
  currentFilter?: string;
  onSubmit: (data: GenderFormValues) => void;
  onCancel?: () => void;
}

export function GenderForm({
  currentGender,
  currentInterestedIn,
  currentFilter,
  onSubmit,
  onCancel,
}: GenderFormProps) {
  // Map "More" to "Other" for the simplified 3-option UI
  const mapToFormValue = (value: string | undefined): "M" | "F" | "Other" => {
    if (value === "M") return "M";
    if (value === "F") return "F";
    if (value === "Other" || value === "More") return "Other";
    return "Other"; // default for Unknown or missing values
  };

  const form = useForm<GenderFormValues>({
    resolver: zodResolver(genderFormSchema),
    defaultValues: {
      gender: isGenderDataUnknown(currentGender)
        ? "M"
        : mapToFormValue(currentGender),
      genderFilter: isGenderDataUnknown(currentFilter)
        ? "F"
        : mapToFormValue(currentFilter),
      interestedIn: isGenderDataUnknown(currentInterestedIn)
        ? "F"
        : mapToFormValue(currentInterestedIn),
    },
  });

  const handleSubmit = (data: GenderFormValues) => {
    // Map "Other" to appropriate values:
    // - For gender: keep as "Other"
    // - For interested_in/genderFilter: map to "More" (means "everyone")
    const mappedData = {
      gender: data.gender,
      genderFilter: data.genderFilter === "Other" ? "More" : data.genderFilter,
      interestedIn: data.genderFilter === "Other" ? "More" : data.genderFilter,
    };
    onSubmit(mappedData as GenderFormValues);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full space-y-5"
      >
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-gray-900">
                What is your gender?
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-wrap gap-2"
                >
                  {GENDER_OPTIONS.map((gender) => (
                    <Label
                      key={gender}
                      htmlFor={`gender-${gender}`}
                      className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 active:bg-gray-100 sm:min-h-[40px] [&:has(:checked)]:border-red-500 [&:has(:checked)]:bg-red-50 [&:has(:checked)]:text-red-700"
                    >
                      <RadioGroupItem
                        id={`gender-${gender}`}
                        value={gender}
                        className="h-4 w-4"
                      />
                      <span>{getGenderLabel(gender, false)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="genderFilter"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-gray-900">
                Who are you looking for?
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-wrap gap-2"
                >
                  {GENDER_OPTIONS.map((gender) => (
                    <Label
                      key={gender}
                      htmlFor={`genderFilter-${gender}`}
                      className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 active:bg-gray-100 sm:min-h-[40px] [&:has(:checked)]:border-red-500 [&:has(:checked)]:bg-red-50 [&:has(:checked)]:text-red-700"
                    >
                      <RadioGroupItem
                        id={`genderFilter-${gender}`}
                        value={gender}
                        className="h-4 w-4"
                      />
                      <span>{getGenderLabel(gender, true)}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="min-h-[44px] sm:min-h-[40px]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="min-h-[44px] flex-1 bg-red-600 hover:bg-red-700 sm:min-h-[40px]"
          >
            Confirm
          </Button>
        </div>
      </form>
    </Form>
  );
}

function getGenderLabel(
  gender: "M" | "F" | "Other",
  pluralize: boolean,
): string {
  switch (gender) {
    case "M":
      return pluralize ? "Men" : "Man";
    case "F":
      return pluralize ? "Women" : "Woman";
    case "Other":
      // For "Who are you looking for?", "Other" means "Everyone"
      // For "What is your gender?", "Other" means "Other"
      return pluralize ? "Everyone" : "Other";
    default:
      return "Other";
  }
}
