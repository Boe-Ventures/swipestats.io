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
        <TooltipTrigger asChild>
          <Button variant="outline">Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>Helpful hint</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);
