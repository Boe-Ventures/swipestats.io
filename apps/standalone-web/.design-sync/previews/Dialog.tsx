import { Button, SimpleDialog } from "swipestats";

// Rendered statically open (cardMode single). SimpleDialog is the canonical
// helper: {title, description, trigger, footer, children}.
export const DeleteProfile = () => (
  <SimpleDialog
    open
    title="Delete profile?"
    description="This permanently removes your uploaded data."
    trigger={<Button variant="outline">Open dialog</Button>}
    footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete profile</Button>
      </div>
    }
  >
    <p className="text-sm text-gray-600">
      Your Tinder and Hinge uploads, comparisons, and insights will be gone for
      good. This cannot be undone.
    </p>
  </SimpleDialog>
);
