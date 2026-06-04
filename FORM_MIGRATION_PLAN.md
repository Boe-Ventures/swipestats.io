# Form Migration Plan — adopt the new shadcn `Field` spec everywhere

> **Goal:** Migrate all real forms in swipestats from the legacy `form.tsx`
> (`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`) pattern and
> hand-rolled `Label` + input markup to the modern `Field` / `Controller`
> pattern that already lives in `src/components/ui/form-new.tsx`.
>
> **Status:** Not started. This is consistency + a11y polish, not a bug fix.
> The team explicitly chose not to rush (see `src/components/ui/FORM_MIGRATION.md`).

## Why

- The new spec is **already built** (`form-new.tsx`) and matches current shadcn docs.
- Legacy `FormField` hides `fieldState`, omits `aria-invalid`, and uses
  auto-generated IDs — worse accessibility and less layout flexibility.
- Hand-rolled forms keep re-introducing the same papercuts we've been fixing
  one-by-one (labels with no `mb`, inconsistent spacing, no error display).
  Migrating gets correct spacing/validation/a11y "for free."

## Source of truth for the pattern

`src/components/ui/FORM_MIGRATION.md` already contains the exact step-by-step
recipe and copy-paste examples for Input, Select, Checkbox array, Radio, Switch.
**Follow it verbatim.** Do not invent a new convention.

Quick reference (Input):
```tsx
import { Controller } from "@/components/ui/form-new";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/form-new";

<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

## Scope & inventory (as of this plan)

Re-verify counts before starting — the codebase moves:
```bash
# Old FormField consumers (excluding ui infra)
grep -rl "FormField" src | grep -v node_modules \
  | grep -vE "components/ui/(form|formFields|form-inputs)" | grep -v FORM_MIGRATION

# Files using raw Label (candidate manual forms — filter false positives by hand)
grep -rl "components/ui/label" src | grep -v node_modules
```

### Bucket 1 — Legacy `FormField` (RHF) forms → rewrite to `Controller` + `Field`
~10 files. Each is a structural rewrite (~15–30 min + test validation states).
- [ ] `src/app/app/profile-compare/create-comparison-dialog.tsx`
- [ ] `src/app/app/profile-compare/[id]/comparison-detail.tsx` (Settings form)
- [ ] `src/app/app/account/LocationForm.tsx`
- [ ] `src/app/app/events/AddEventDialog.tsx`
- [ ] `src/app/(marketing)/upload/_components/ProfileEnhancement/LocationForm.tsx`
- [ ] `src/app/(marketing)/upload/_components/ProfileEnhancement/GenderForm.tsx`
- [ ] `src/app/(marketing)/upload/_components/ProfileEnhancement/WorkEducationForm.tsx`
- [ ] `src/app/(marketing)/insights/tinder/[tinderId]/compare/_components/UserFeedback.tsx`
- [ ] `src/app/(marketing)/insights/hinge/[hingeId]/_components/charts/MasterHingeActivityChart.tsx` ⚠️ verify it's a real form, not a chart control
- [ ] `src/app/(marketing)/insights/tinder/[tinderId]/_components/charts/MasterActivityChart.tsx` ⚠️ verify

### Bucket 2 — Real manual forms (raw `Label` + input, no RHF wrapper) → wrap in `Field`
~12 files. Lighter (~10–20 min each): wrap fields, add `htmlFor`/`aria-invalid`,
add `FieldError` where there's validation. Several are auth forms — test carefully.
- [ ] `src/app/(auth)/signup/SignUpForm.tsx`
- [ ] `src/app/(auth)/signin/SignInForm.tsx`
- [ ] `src/app/(auth)/signin/ForgotPasswordDialog.tsx`
- [ ] `src/app/(auth)/reset-password/ResetPasswordForm.tsx`
- [ ] `src/app/app/account/ProfileForm.tsx`
- [ ] `src/app/app/account/DatingAppsForm.tsx`
- [ ] `src/app/app/account/NewsletterPreferencesForm.tsx`
- [ ] `src/app/app/account/EmailVerificationForm.tsx`
- [ ] `src/app/app/account/SelfAssessmentForm.tsx`
- [ ] `src/app/app/dashboard/ConversionModal.tsx`
- [ ] `src/app/share/create/[shareKey]/publish-dialog.tsx`
- [ ] `src/app/share/profile-compare/[shareKey]/anonymous-name-prompt.tsx`
- [ ] `src/components/auth/UsernameField.tsx`
- [ ] `src/components/auth/CollapsibleEmailField.tsx`
- [ ] `src/app/app/profile-compare/[id]/add-content-dialog.tsx` (caption input)
- [ ] `src/app/app/profile-compare/[id]/edit-content-dialog.tsx`
- [ ] `src/app/app/profile-compare/[id]/comparison-column.tsx` (inline Bio/Title — these are debounced inline editors, not a classic form; lower priority)

### Bucket 3 — Shared field wrappers (HIGHEST LEVERAGE — do these first)
Built on legacy `form.tsx`; migrating them updates every consumer for free.
- [ ] `src/components/ui/form-inputs/TextField.tsx`
- [ ] `src/components/ui/form-inputs/RichTextareaField.tsx`
- [ ] `src/components/ui/form-inputs/DatePickerField.tsx`
- [ ] `src/components/ui/form-inputs/DateRangePickerField.tsx`
- [ ] `src/components/ui/form-inputs/RadioGroupCardsField.tsx`
- [ ] `src/components/ui/form-inputs/CheckboxGroupCardsField.tsx`
- [ ] `src/components/ui/formFields/TagGroupFormField.tsx`
- [ ] `src/components/ui/formFields/RadioGroupFormField.tsx`

### Bucket 4 — Skip (false positives)
Use `Label` incidentally; **not forms.** Do not touch.
- `.../charts/SwipeComparisonChart.tsx`, `TinderInsightsFunnel.tsx`,
  `DatingFunnel.tsx`, `CompleteYourOutcomes.tsx`,
  `directory/_components/MapViewToggle.tsx`,
  `share/profile-compare/[shareKey]/view-only-column.tsx`
- (Verify each before skipping.)

## Recommended order

1. **Bucket 3** (shared wrappers) — biggest leverage; consumers upgrade for free.
2. **Bucket 1** (legacy `FormField` forms) — the core migration.
3. **Bucket 2** (manual forms) — wrap + a11y.
4. Re-grep to confirm no legacy `form.tsx` imports remain outside intentionally-kept files.
5. Once `form.tsx` has zero consumers, decide whether to delete it or keep as a thin re-export.

## Per-file checklist

For each form:
1. Swap imports from `@/components/ui/form` → `@/components/ui/form-new`.
2. `FormField` → `Controller` (destructure `{ field, fieldState }`).
3. `FormItem`/`FormControl`/`FormMessage` → `Field` / `FieldError`.
4. Add `data-invalid={fieldState.invalid}` on `<Field>`, `aria-invalid` +
   `id={field.name}` on the control, `htmlFor={field.name}` on `<FieldLabel>`.
5. Keep `FieldDescription` for helper text (replaces ad-hoc `<p>` hints).
6. `bun typecheck` the file.
7. **Manually open the form** and verify: layout, label spacing, validation
   error display, and submit still works. (Same RHF underneath, but display shifts.)

## Effort estimate

- Per `FormField` form: ~15–30 min. Per manual form: ~10–20 min. Wrappers: a few hours total.
- ~22 real files + ~8 wrappers. **Roughly 1–2 focused days** done by hand with testing.
- Difficulty is **low per form** (mechanical, well-documented) — the cost is breadth + the discipline to eyeball-test each one.

## Option: run as a multi-agent workflow

This is a strong fit for orchestration (one agent per form, parallelized, each
following `FORM_MIGRATION.md` + typechecking). It spawns many agents/tokens, so
it needs explicit opt-in. Suggested shape:
- Phase 1: migrate Bucket 3 wrappers (barrier — consumers depend on them).
- Phase 2: pipeline Buckets 1 & 2, one agent per file, each typechecks its file.
- Phase 3: a final agent greps for residual legacy `form.tsx` imports + runs full `bun typecheck`.
- Worktree isolation per agent if running concurrently to avoid edit conflicts.

## Done when

- [ ] No app code imports `@/components/ui/form` (only `form-new`), except intentionally-kept files.
- [ ] `bun typecheck` and `bun lint` pass.
- [ ] All migrated forms visually verified (spacing, validation, submit).
- [ ] `FORM_MIGRATION.md` updated to note migration complete / `form.tsx` deprecated.
