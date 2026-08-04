import {
  Button,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
} from "swipestats";

// Rendered statically open (cardMode single) — right-side sheet.
export const Filters = () => (
  <Sheet open>
    <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
    <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
        <SheetDescription>Refine the directory.</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="verified">Verified profiles only</Label>
          <Switch id="verified" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="active">Active this month</Label>
          <Switch id="active" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="premium">Premium insights</Label>
          <Switch id="premium" />
        </div>
      </div>
      <SheetFooter>
        <Button>Apply filters</Button>
        <Button variant="outline">Reset</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
