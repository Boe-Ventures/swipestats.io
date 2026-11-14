import { Input, Label } from "swipestats";

export const Default = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="in-email">Email</Label>
    <Input id="in-email" placeholder="you@email.com" className="mt-1.5" />
  </div>
);

export const WithValue = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="in-anon">Anonymized ID</Label>
    <Input id="in-anon" defaultValue="swipestats-7f3a2c" className="mt-1.5" />
  </div>
);

export const Invalid = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="in-invalid">Email</Label>
    <Input
      id="in-invalid"
      aria-invalid
      defaultValue="not-an-email"
      className="mt-1.5"
    />
  </div>
);

export const Disabled = () => (
  <Input disabled placeholder="Disabled input" className="w-full max-w-sm" />
);
