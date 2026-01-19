"use client";

import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { CheckboxGroupCardsField } from "@/components/ui/form-inputs/CheckboxGroupCardsField";
import { InfoAlert } from "@/components/ui/alert";
import type { HingeConsentState } from "@/lib/interfaces/HingeConsent";
import { useEffect } from "react";

interface HingeConsentFormProps {
  value: HingeConsentState;
  onChange: (consent: HingeConsentState) => void;
}

const CONSENT_OPTIONS = [
  {
    value: "sharePhotos",
    label: "Profile Photos",
  },
  {
    value: "shareWorkInfo",
    label: "Work Information",
  },
];

export function HingeConsentForm({ value, onChange }: HingeConsentFormProps) {
  const form = useForm<{ consents: string[] }>({
    defaultValues: {
      consents: Object.entries(value)
        .filter(([key, isChecked]) => key !== "terms" && isChecked)
        .map(([key]) => key),
    },
  });

  const consents = form.watch("consents");

  useEffect(() => {
    const newConsent: HingeConsentState = {
      terms: value.terms, // Preserve terms state (managed separately)
      sharePhotos: consents.includes("sharePhotos"),
      shareWorkInfo: consents.includes("shareWorkInfo"),
      shareMatches: value.shareMatches, // Preserve these (not shown in this form)
      shareMessages: value.shareMessages,
      sharePrompts: value.sharePrompts,
    };
    onChange(newConsent);
  }, [
    consents,
    onChange,
    value.terms,
    value.shareMatches,
    value.shareMessages,
    value.sharePrompts,
  ]);

  return (
    <Form {...form}>
      <form className="space-y-4">
        <CheckboxGroupCardsField
          control={form.control}
          name="consents"
          label="What to Include"
          description="Choose what information you'd like to include in your profile"
          options={CONSENT_OPTIONS}
          layout="grid"
        />
        <InfoAlert>
          You can add this information later. Note: If you don't share certain
          data, you won't be able to see that information on other users'
          profiles either.
        </InfoAlert>
      </form>
    </Form>
  );
}
