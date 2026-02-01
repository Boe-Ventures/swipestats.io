"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { parseAsString, useQueryState } from "nuqs";
import { RadioGroupCardsField } from "@/components/ui/form-inputs/RadioGroupCardsField";
import { Form } from "@/components/ui/form";

const providers = [
  {
    value: "tinder",
    label: "Tinder",
    description: "The world's most popular dating app.",
  },
  {
    value: "hinge",
    label: "Hinge",
    description: "The dating app designed to be deleted.",
  },
  {
    value: "bumble",
    label: "Bumble",
    description: "Women make the first move.",
  },
];

export function ProviderSelector() {
  const [provider, setProvider] = useQueryState(
    "provider",
    parseAsString.withDefault(""),
  );

  const form = useForm({
    defaultValues: {
      provider: provider || "",
    },
  });

  // Watch for changes and update URL
  const watchProvider = form.watch("provider");

  useEffect(() => {
    if (watchProvider !== provider) {
      void setProvider(watchProvider);
    }
  }, [watchProvider, provider, setProvider]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 text-center">
        {/* <h2 className="mb-2 text-sm font-semibold tracking-wide text-rose-600 uppercase">
          Upload
        </h2> */}
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Visualize your{" "}
          {provider
            ? provider.charAt(0).toUpperCase() + provider.slice(1)
            : "dating"}{" "}
          data
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Upload your data anonymously and compare it to demographics from
          around the world!
        </p>
      </div>

      {/* Provider Selection */}
      <Form {...form}>
        <form className="space-y-6">
          <RadioGroupCardsField
            control={form.control}
            name="provider"
            label="Select your dating app"
            options={providers}
            gridCols={3}
          />
        </form>
      </Form>
    </div>
  );
}
