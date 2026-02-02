# Form Components Migration Guide

## Overview

We have two form component systems in this codebase:

- **`form.tsx`** (Legacy) - Older shadcn/ui pattern with wrapped abstractions
- **`form-new.tsx`** (Modern) - New pattern following React Hook Form best practices

## Which Should I Use?

### ✅ For NEW forms → Use `form-new.tsx`

Import from the new file:
```tsx
import { Controller, useForm, zodResolver } from "@/components/ui/form-new";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/form-new";
```

### ⚠️ For EXISTING forms → Keep using `form.tsx` (for now)

We're not rushing to migrate existing forms. The old pattern still works fine.

## Key Differences

### Old Pattern (form.tsx)
```tsx
<FormField
  name="email"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Issues:**
- ❌ Hidden `fieldState` - harder to access validation state
- ❌ No `aria-invalid` on inputs
- ❌ Auto-generated IDs can be confusing
- ❌ Less flexible for custom layouts

### New Pattern (form-new.tsx)
```tsx
<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
      <Input
        {...field}
        id={field.name}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

**Benefits:**
- ✅ Explicit `fieldState` for validation
- ✅ Proper `aria-invalid` for accessibility
- ✅ More flexible and composable
- ✅ Better TypeScript support
- ✅ Self-documenting with JSDoc examples

## Migration Checklist

When migrating a form from old to new:

1. **Change imports:**
   ```tsx
   // Before
   import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
   
   // After
   import { Controller } from "@/components/ui/form-new";
   import { Field, FieldLabel, FieldError } from "@/components/ui/form-new";
   ```

2. **Replace FormField with Controller:**
   ```tsx
   // Before
   <FormField name="email" control={form.control} render={({ field }) => (
   
   // After
   <Controller name="email" control={form.control} render={({ field, fieldState }) => (
   ```

3. **Update the field structure:**
   ```tsx
   // Before
   <FormItem>
     <FormLabel>Email</FormLabel>
     <FormControl>
       <Input {...field} />
     </FormControl>
     <FormMessage />
   </FormItem>
   
   // After
   <Field data-invalid={fieldState.invalid}>
     <FieldLabel htmlFor={field.name}>Email</FieldLabel>
     <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
     {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
   </Field>
   ```

4. **Add accessibility attributes:**
   - Add `data-invalid={fieldState.invalid}` to `<Field>`
   - Add `aria-invalid={fieldState.invalid}` to the input component
   - Add `id={field.name}` to the input
   - Add `htmlFor={field.name}` to the label

## Examples

See `form-new.example.tsx` for complete working examples:

- Basic input and textarea
- Select dropdowns
- Checkbox arrays
- Radio groups
- Switches
- Responsive layouts
- Complex multi-section forms

## Common Patterns

### Input Field
```tsx
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      <FieldDescription>A short title for your post</FieldDescription>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Select
```tsx
<Controller
  name="country"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Country</FieldLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="us">United States</SelectItem>
        </SelectContent>
      </Select>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Checkbox Array
```tsx
<Controller
  name="preferences"
  control={form.control}
  render={({ field, fieldState }) => (
    <FieldSet>
      <FieldLegend>Preferences</FieldLegend>
      <FieldGroup data-slot="checkbox-group">
        {options.map((option) => (
          <Field key={option.id} orientation="horizontal" data-invalid={fieldState.invalid}>
            <Checkbox
              id={option.id}
              checked={field.value?.includes(option.id)}
              onCheckedChange={(checked) => {
                const newValue = checked
                  ? [...(field.value || []), option.id]
                  : (field.value || []).filter((v) => v !== option.id);
                field.onChange(newValue);
              }}
              aria-invalid={fieldState.invalid}
            />
            <FieldLabel htmlFor={option.id}>{option.label}</FieldLabel>
          </Field>
        ))}
      </FieldGroup>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </FieldSet>
  )}
/>
```

### Switch
```tsx
<Controller
  name="twoFactor"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
      <FieldContent>
        <FieldLabel htmlFor={field.name}>Two-Factor Auth</FieldLabel>
        <FieldDescription>Enable for extra security</FieldDescription>
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
```

## Questions?

- Check `form-new.tsx` - it has comprehensive JSDoc comments
- Look at `form-new.example.tsx` - full working examples
- Old forms still work - no rush to migrate everything

## Timeline

- **Now:** Use `form-new.tsx` for all new forms
- **Future:** Gradually migrate high-traffic forms when convenient
- **No deadline:** Old pattern will be supported indefinitely
