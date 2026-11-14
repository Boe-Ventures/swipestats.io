import { Checkbox, Input, Label } from "swipestats";

export const Default = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="lbl-email">Email</Label>
    <Input id="lbl-email" placeholder="you@email.com" className="mt-1.5" />
  </div>
);

export const WithCheckbox = () => (
  <div className="flex items-center gap-2.5">
    <Checkbox id="lbl-remind" defaultChecked />
    <Label htmlFor="lbl-remind">Email me a reminder</Label>
  </div>
);

export const Disabled = () => (
  <div className="group flex items-center gap-2.5" data-disabled="true">
    <Checkbox id="lbl-disabled" disabled />
    <Label htmlFor="lbl-disabled">Share anonymously</Label>
  </div>
);
