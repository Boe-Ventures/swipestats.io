import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "swipestats";

// Rendered statically open (cardMode single). Tooltip opens to the top,
// so the trigger sits below some headroom.
export const Hint = () => (
  <div className="flex justify-center pt-16">
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger render={<Button variant="outline">Tooltip</Button>} />
        <TooltipContent>Helpful hint</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);
