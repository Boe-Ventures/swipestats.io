# SwipeStats UI — conventions

SwipeStats is a dating-app analytics product (upload your Tinder/Hinge export,
see your insights). The kit is shadcn-derived on **Tailwind v4** with a
**rose brand theme** — light surface, `rose-600` primary. Voice: confident,
data-forward, privacy-first ("identifiers are stripped in your browser").

## Setup

Wrap the app in `ThemeProvider` (exported from the kit) — it manages the
`light`/`dark`/`auto` class on `<html>`. The app ships light; dark tokens
exist but are not the product surface. `Toaster` (sonner) mounts once at the
root; fire notifications with `toast.success(…)` / `toast.error(…)`.

## Styling idiom

Style with Tailwind utilities against the theme tokens — never hard-code
rose hexes:

- Surfaces: `bg-background`, `bg-card`, `bg-muted`, `bg-popover`
- Text: `text-foreground`, `text-muted-foreground`, `text-card-foreground`
- Brand: `bg-primary text-primary-foreground` (rose-600); focus rings are
  built into the controls (`focus-visible:ring-ring/50`)
- Feedback: `bg-destructive`, plus the Alert helpers below
- Borders/radius: `border-border`, `rounded-lg` (`--radius: 0.65rem`)
- Type: body is Inter (`font-sans`); stat labels/numbers use
  `font-mono` (Geist Mono) + `tabular-nums`; big stats are
  `font-bold tracking-tight tabular-nums`

Token definitions live in the `styles.css` import closure (the `:root` block
in `_ds_bundle.css`) — read it before inventing a color.

## Component notes (where the API deviates from stock shadcn)

- **Button**: has `loading` (renders `Spinner` for you) and a sibling
  `ButtonLink` for link-styled-as-button; `asChild` merges onto any element.
  `SmartLink` is the inline text link.
- **Alert**: use the semantic helpers — `InfoAlert`, `SuccessAlert`,
  `WarningAlert`, `ErrorAlert` (also `PrimaryAlert`, `NeutralAlert`,
  `SwipestatsAlert`) — instead of composing `Alert` by hand.
- **Forms**: react-hook-form. `useForm` + `Controller` +
  the `Field` family (`Field`, `FieldLabel`, `FieldDescription`,
  `FieldError`, `FieldSet`, `FieldLegend`, `FieldGroup`) — all exported from
  the kit; ready-made bound inputs exist (`TextField`, `NumberField`,
  `DatePickerField`, `CountrySelect`, `CitySelect`, …).
- **Select**: `SimpleSelect` takes `{placeholder, options: [{value, label}]}`
  — prefer it for plain dropdowns; the composable `Select` family exists too.
- **Dialog**: `SimpleDialog` takes `{title, description, trigger, children}`.
- **TypographyList** takes `items: [{text}]` — children are ignored.
- **Banner** has demo defaults — always pass `title`/`message`/`ctaText`.
- **Empty** is compound: `Empty > EmptyHeader > EmptyTitle/EmptyDescription`.
- **Tooltip** requires a `TooltipProvider` ancestor.

## Idiomatic snippet

```tsx
<Card className="w-full max-w-sm">
  <CardHeader>
    <CardTitle>Match rate</CardTitle>
    <CardDescription>Tinder · all time</CardDescription>
  </CardHeader>
  <CardContent>
    <span className="text-3xl font-bold tracking-tight tabular-nums">19.9%</span>
  </CardContent>
  <CardFooter>
    <Button size="sm" variant="outline">View details</Button>
  </CardFooter>
</Card>
```

Per-component API and examples: each component's `.d.ts` and `.prompt.md`.
