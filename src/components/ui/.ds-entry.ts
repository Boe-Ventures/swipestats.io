// design-sync barrel entry — the SwipeStats kit lives in the app (no workspace
// package; index.ts only exports cn), so this barrel re-exports the public API
// for the window.SwipeStatsUI bundle. Regenerate when components are added.
// Deliberately excluded: tan-form.tsx + country-select.tsx (legacy duplicates of
// form-new.tsx / form-inputs/CountrySelect.tsx — name collisions), *.example/
// *.test files, upload/ImageUploadDialog (no named component export).
import "./.ds-shim.ts";

export * from "./index";
export * from "./accordion";
export * from "./alert";
export * from "./alert-dialog";
export * from "./avatar";
export * from "./badge";
export * from "./banner";
export * from "./button";
export * from "./button-group";
export * from "./calendar";
export * from "./card";
export * from "./carousel";
export * from "./chart";
export * from "./checkbox";
export * from "./collapsible";
export * from "./command";
export * from "./copyable-field";
export * from "./dialog";
export * from "./drawer";
export * from "./dropdown-menu";
export * from "./empty";
export * from "./form-new";
export * from "./hover-card";
export * from "./input";
export * from "./input-group";
export * from "./kanban";
export * from "./label";
export * from "./navigation-menu";
export * from "./NewOldLogo";
export * from "./OldSwipestatsLogo";
export * from "./popover";
export * from "./progress";
export * from "./radio-group";
export * from "./scroll-area";
export * from "./select";
export * from "./separator";
export * from "./sheet";
export * from "./skeleton";
export * from "./smart-link";
export * from "./spinner";
export * from "./switch";
export * from "./table";
export * from "./tabs";
export * from "./textarea";
export * from "./theme";
export * from "./TinderInsights";
export * from "./toast";
export * from "./toggle";
export * from "./toggle-group";
export * from "./tooltip";
export * from "./typography";
export * from "./charts/MyAreaChart";
export * from "./compound/combobox";
export * from "./form-inputs/CheckboxGroupCardsField";
export * from "./form-inputs/CitySelect";
export * from "./form-inputs/CountrySelect";
export * from "./form-inputs/DatePickerField";
export * from "./form-inputs/DateRangePickerField";
export * from "./form-inputs/NumberField";
export * from "./form-inputs/PresetNumberField";
export * from "./form-inputs/RadioGroupCardsField";
export * from "./form-inputs/RichTextareaField";
export * from "./form-inputs/TextField";
export * from "./form-inputs/TimeZoneSelect";
export * from "./formFields/RadioGroupFormField";
export * from "./formFields/TagGroupFormField";
export * from "./upload/ImageGalleryDisplay";
export * from "./upload/ImageUpload";
