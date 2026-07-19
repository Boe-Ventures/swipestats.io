import { ScrollArea } from "swipestats";

const conversations = [
  "Emma — Tinder",
  "Sofia — Hinge",
  "Olivia — Tinder",
  "Maja — Bumble",
  "Ingrid — Tinder",
  "Nora — Hinge",
  "Thea — Tinder",
  "Frida — Bumble",
  "Julie — Tinder",
  "Amalie — Hinge",
  "Ida — Tinder",
  "Sara — Bumble",
  "Vilde — Tinder",
  "Hedda — Hinge",
  "Tuva — Tinder",
];

// type="always" keeps the scrollbar visible for the static capture.
export const ConversationList = () => (
  <ScrollArea type="always" className="h-40 w-full max-w-xs rounded-md border">
    <div className="p-2">
      <p className="px-2 py-1.5 text-sm font-medium">Conversations</p>
      {conversations.map((name) => (
        <p key={name} className="px-2 py-1.5 text-sm text-gray-600">
          {name}
        </p>
      ))}
    </div>
  </ScrollArea>
);
