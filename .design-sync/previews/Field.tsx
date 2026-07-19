import {
  Controller,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Textarea,
  useForm,
} from "swipestats";

export const Basic = () => (
  <div className="w-full max-w-sm">
    <Field>
      <FieldLabel htmlFor="fld-email">Email</FieldLabel>
      <Input id="fld-email" placeholder="you@email.com" />
      <FieldDescription>
        We only use it to remind you when your export is ready.
      </FieldDescription>
    </Field>
  </div>
);

export const Group = () => (
  <div className="w-full max-w-md">
    <FieldSet>
      <FieldLegend>Data request</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fld-provider">Provider</FieldLabel>
          <Input id="fld-provider" defaultValue="Tinder" />
        </Field>
        <Field>
          <FieldLabel htmlFor="fld-notes">Notes</FieldLabel>
          <Textarea
            id="fld-notes"
            placeholder="Anything we should know about your export?"
          />
        </Field>
      </FieldGroup>
    </FieldSet>
  </div>
);

export const WithValidation = () => {
  const form = useForm<{ email: string }>({
    defaultValues: { email: "not-an-email" },
  });
  return (
    <form className="w-full max-w-sm">
      <Controller
        name="email"
        control={form.control}
        rules={{ pattern: { value: /@/, message: "Enter a valid email." } }}
        render={({ field }) => (
          <Field data-invalid>
            <FieldLabel htmlFor="fld-invalid">Email</FieldLabel>
            <Input {...field} id="fld-invalid" aria-invalid />
            <FieldError errors={[{ message: "Enter a valid email." }]} />
          </Field>
        )}
      />
    </form>
  );
};
