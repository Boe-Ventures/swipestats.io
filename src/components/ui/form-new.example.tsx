/**
 * Modern Form Examples
 *
 * This file demonstrates how to use the new form-new.tsx components.
 * Copy and adapt these patterns for your forms.
 */

"use client";

import { zodResolver, useForm, Controller } from "./form-new";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldTitle,
} from "./form-new";
import { Input } from "./input";
import { Textarea } from "./textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Checkbox } from "./checkbox";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Switch } from "./switch";
import { Button } from "./button";
import * as z from "zod";

/* -----------------------------------------------------------------------------
 * Example 1: Basic Form with Input and Textarea
 * -------------------------------------------------------------------------- */

const basicFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
});

export function BasicFormExample() {
  const form = useForm<z.infer<typeof basicFormSchema>>({
    resolver: zodResolver(basicFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  function onSubmit(data: z.infer<typeof basicFormSchema>) {
    console.log(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Input Field */}
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Enter a title"
            />
            <FieldDescription>
              A short, descriptive title for your post.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Textarea Field */}
      <Controller
        name="description"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Description</FieldLabel>
            <Textarea
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="Write a description..."
              className="min-h-[120px]"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 2: Select Field
 * -------------------------------------------------------------------------- */

const selectFormSchema = z.object({
  country: z.string().min(1, "Please select a country"),
});

export function SelectFormExample() {
  const form = useForm<z.infer<typeof selectFormSchema>>({
    resolver: zodResolver(selectFormSchema),
    defaultValues: {
      country: "",
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-6"
    >
      <Controller
        name="country"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Country</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Select your country of residence.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 3: Checkbox Array
 * -------------------------------------------------------------------------- */

const checkboxFormSchema = z.object({
  preferences: z.array(z.string()).min(1, "Select at least one preference"),
});

const preferences = [
  { id: "email", label: "Email notifications" },
  { id: "sms", label: "SMS notifications" },
  { id: "push", label: "Push notifications" },
];

export function CheckboxFormExample() {
  const form = useForm<z.infer<typeof checkboxFormSchema>>({
    resolver: zodResolver(checkboxFormSchema),
    defaultValues: {
      preferences: [],
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-6"
    >
      <Controller
        name="preferences"
        control={form.control}
        render={({ field, fieldState }) => (
          <FieldSet>
            <FieldLegend variant="label">Notification Preferences</FieldLegend>
            <FieldDescription>
              Choose how you want to receive notifications.
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group">
              {preferences.map((pref) => (
                <Field
                  key={pref.id}
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                >
                  <Checkbox
                    id={pref.id}
                    checked={field.value?.includes(pref.id)}
                    onCheckedChange={(checked) => {
                      const newValue = checked
                        ? [...(field.value || []), pref.id]
                        : (field.value || []).filter((v) => v !== pref.id);
                      field.onChange(newValue);
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor={pref.id} className="font-normal">
                    {pref.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldSet>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 4: Radio Group
 * -------------------------------------------------------------------------- */

const radioFormSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

const plans = [
  {
    id: "free",
    title: "Free",
    description: "Perfect for getting started",
  },
  {
    id: "pro",
    title: "Pro",
    description: "Best for professionals",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description: "For large organizations",
  },
];

export function RadioFormExample() {
  const form = useForm<z.infer<typeof radioFormSchema>>({
    resolver: zodResolver(radioFormSchema),
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-6"
    >
      <Controller
        name="plan"
        control={form.control}
        render={({ field, fieldState }) => (
          <FieldSet>
            <FieldLegend variant="label">Select Plan</FieldLegend>
            <FieldDescription>
              Choose the plan that works best for you.
            </FieldDescription>
            <RadioGroup value={field.value} onValueChange={field.onChange}>
              {plans.map((plan) => (
                <FieldLabel key={plan.id} htmlFor={plan.id}>
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldContent>
                      <FieldTitle>{plan.title}</FieldTitle>
                      <FieldDescription>{plan.description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem
                      value={plan.id}
                      id={plan.id}
                      aria-invalid={fieldState.invalid}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldSet>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 5: Switch (Toggle)
 * -------------------------------------------------------------------------- */

const switchFormSchema = z.object({
  twoFactor: z.boolean(),
});

export function SwitchFormExample() {
  const form = useForm<z.infer<typeof switchFormSchema>>({
    resolver: zodResolver(switchFormSchema),
    defaultValues: {
      twoFactor: false,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-6"
    >
      <Controller
        name="twoFactor"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FieldLabel htmlFor={field.name}>
                Two-Factor Authentication
              </FieldLabel>
              <FieldDescription>
                Enable two-factor authentication for extra security.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldContent>
            <Switch
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 6: Responsive Layout (Horizontal on Desktop, Vertical on Mobile)
 * -------------------------------------------------------------------------- */

const responsiveFormSchema = z.object({
  language: z.string(),
  theme: z.string(),
});

export function ResponsiveFormExample() {
  const form = useForm<z.infer<typeof responsiveFormSchema>>({
    resolver: zodResolver(responsiveFormSchema),
    defaultValues: {
      language: "en",
      theme: "light",
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-6"
    >
      <Controller
        name="language"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field orientation="responsive" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FieldLabel htmlFor={field.name}>Language</FieldLabel>
              <FieldDescription>
                Select your preferred language.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldContent>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={field.name}
                aria-invalid={fieldState.invalid}
                className="md:w-[180px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
}

/* -----------------------------------------------------------------------------
 * Example 7: Complex Form with Multiple Field Types
 * -------------------------------------------------------------------------- */

const complexFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().optional(),
  country: z.string().min(1, "Please select a country"),
  notifications: z.array(z.string()),
  plan: z.enum(["free", "pro"]),
  marketing: z.boolean(),
});

export function ComplexFormExample() {
  const form = useForm<z.infer<typeof complexFormSchema>>({
    resolver: zodResolver(complexFormSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
      country: "",
      notifications: [],
      marketing: false,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => console.log(data))}
      className="space-y-8"
    >
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>

        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Username</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="bio"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Tell us about yourself..."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {/* Preferences Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Preferences</h3>

        <Controller
          name="notifications"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet>
              <FieldLegend>Notifications</FieldLegend>
              <FieldGroup data-slot="checkbox-group">
                {preferences.map((pref) => (
                  <Field
                    key={pref.id}
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      id={`complex-${pref.id}`}
                      checked={field.value?.includes(pref.id)}
                      onCheckedChange={(checked) => {
                        const newValue = checked
                          ? [...(field.value || []), pref.id]
                          : (field.value || []).filter((v) => v !== pref.id);
                        field.onChange(newValue);
                      }}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldLabel
                      htmlFor={`complex-${pref.id}`}
                      className="font-normal"
                    >
                      {pref.label}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <Controller
          name="marketing"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Marketing Emails</FieldLabel>
                <FieldDescription>
                  Receive updates about new features and promotions.
                </FieldDescription>
              </FieldContent>
              <Switch
                id={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit">Save Changes</Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </div>
    </form>
  );
}
