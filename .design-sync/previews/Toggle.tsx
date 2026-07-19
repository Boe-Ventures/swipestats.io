import { Toggle } from "swipestats";

export const Default = () => (
  <div className="flex items-center gap-2">
    <Toggle>Matches</Toggle>
    <Toggle defaultPressed>Likes</Toggle>
  </div>
);

export const Outline = () => (
  <div className="flex items-center gap-2">
    <Toggle variant="outline">Anonymize</Toggle>
    <Toggle variant="outline" defaultPressed>
      Show trends
    </Toggle>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-2">
    <Toggle variant="outline" size="sm">
      sm
    </Toggle>
    <Toggle variant="outline" size="default">
      default
    </Toggle>
    <Toggle variant="outline" size="lg">
      lg
    </Toggle>
  </div>
);

export const Disabled = () => (
  <Toggle variant="outline" disabled>
    Locked
  </Toggle>
);
