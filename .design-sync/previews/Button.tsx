import { Button, ButtonLink } from "swipestats";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Upload your data</Button>
    <Button variant="secondary">See the demo</Button>
    <Button variant="outline">Compare profiles</Button>
    <Button variant="ghost">Skip</Button>
    <Button variant="destructive">Delete profile</Button>
    <Button variant="link">How to request your data</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Add note</Button>
    <Button size="default">Upload export</Button>
    <Button size="lg">Get your insights</Button>
  </div>
);

export const States = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button loading>Parsing your file…</Button>
    <Button disabled>Disabled</Button>
    <Button variant="outline" disabled>
      Disabled outline
    </Button>
  </div>
);

export const AsLink = () => (
  <div className="flex flex-wrap items-center gap-3">
    <ButtonLink href="/upload" size="sm">
      ButtonLink to /upload
    </ButtonLink>
    <Button asChild size="sm" variant="outline">
      <a href="/insights">asChild anchor</a>
    </Button>
  </div>
);
