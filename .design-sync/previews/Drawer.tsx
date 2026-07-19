import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "swipestats";

// Rendered statically open (cardMode single) — vaul bottom drawer.
export const QuickActions = () => (
  <Drawer open>
    <DrawerTrigger asChild>
      <Button variant="outline">Open drawer</Button>
    </DrawerTrigger>
    <DrawerContent onOpenAutoFocus={(e) => e.preventDefault()}>
      <DrawerHeader>
        <DrawerTitle>Quick actions</DrawerTitle>
        <DrawerDescription>Mobile-friendly bottom drawer.</DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-col gap-2 px-4">
        <Button variant="outline">Upload new data</Button>
        <Button variant="outline">Compare profiles</Button>
      </div>
      <DrawerFooter>
        <Button>Done</Button>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);
