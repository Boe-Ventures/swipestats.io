import { useEffect } from "react";
import { Toaster, toast } from "swipestats";

// Fires two persistent toasts on mount so the static capture shows them.
// expand keeps both fully visible instead of stacked.
// The sized wrapper matters: the capture harness renders single-mode cells
// inside a transformed div, so sonner's position:fixed list anchors to that
// wrapper — without an explicit height the toasts render cut off at the top.
export const Toasts = () => {
  useEffect(() => {
    toast.success("Insights are ready", { id: "t1", duration: Infinity });
    toast.error("Couldn't parse the file", { id: "t2", duration: Infinity });
  }, []);

  return (
    <div style={{ height: 360, position: "relative" }}>
      <Toaster position="bottom-center" expand />
    </div>
  );
};
