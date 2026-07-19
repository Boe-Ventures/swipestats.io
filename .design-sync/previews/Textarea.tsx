import { Label, Textarea } from "swipestats";

export const Default = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="ta-msg">Message</Label>
    <Textarea id="ta-msg" placeholder="Type something…" className="mt-1.5" />
  </div>
);

export const WithValue = () => (
  <div className="w-full max-w-sm">
    <Label htmlFor="ta-notes">Notes</Label>
    <Textarea
      id="ta-notes"
      className="mt-1.5"
      defaultValue="Requested my Tinder export on Monday — Bumble can take up to 30 days."
    />
  </div>
);

export const Disabled = () => (
  <Textarea
    disabled
    placeholder="Disabled textarea"
    className="w-full max-w-sm"
  />
);
