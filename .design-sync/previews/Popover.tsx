import { Button, Popover, PopoverContent, PopoverTrigger } from "swipestats";

// Rendered statically open (cardMode single). Trigger anchored near the top
// so the bottom-side popover fits inside the fixed viewport.
export const AnonymityNote = () => (
  <div className="flex justify-center pt-8">
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">Popover</Button>
      </PopoverTrigger>
      <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Anonymous by default</p>
          <p className="text-sm text-gray-600">
            Identifiers are stripped in your browser before anything is
            uploaded. Only aggregate stats leave your machine.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  </div>
);
