"use client";

import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { CheckboxGroupCardsField } from "@/components/ui/form-inputs/CheckboxGroupCardsField";
import { InfoAlert } from "@/components/ui/alert";
import type { TinderConsentState } from "@/lib/interfaces/TinderConsent";
import { useEffect } from "react";

interface TinderConsentFormProps {
  value: TinderConsentState;
  onChange: (consent: TinderConsentState) => void;
}

const CONSENT_OPTIONS = [
  {
    value: "photos",
    label: "Profile Photos",
  },
  {
    value: "work",
    label: "Work Information",
  },
];

export function TinderConsentForm({ value, onChange }: TinderConsentFormProps) {
  const form = useForm<{ consents: string[] }>({
    defaultValues: {
      consents: Object.entries(value)
        .filter(([key, isChecked]) => key !== "terms" && isChecked)
        .map(([key]) => key),
    },
  });

  const consents = form.watch("consents");

  useEffect(() => {
    const newConsent: TinderConsentState = {
      photos: consents.includes("photos"),
      work: consents.includes("work"),
      terms: value.terms, // Preserve terms state (managed separately)
    };
    onChange(newConsent);
  }, [consents, onChange, value.terms]);

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
          You can add this information later. Note: If you don&apos;t share
          certain data, you won&apos;t be able to see that information on other
          users&apos; profiles either.
        </InfoAlert>
      </form>
    </Form>
  );
}
