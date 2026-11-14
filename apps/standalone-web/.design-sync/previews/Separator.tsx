import { Separator } from "swipestats";

export const Horizontal = () => (
  <div className="w-full">
    <div className="text-sm">
      <p className="font-medium text-gray-900">Your insights</p>
      <p className="text-gray-600">Match rate, swipe volume, message stats.</p>
    </div>
    <Separator className="my-4" />
    <div className="text-sm">
      <p className="font-medium text-gray-900">Cohort comparison</p>
      <p className="text-gray-600">Benchmark against 7,000+ profiles.</p>
    </div>
  </div>
);

export const Vertical = () => (
  <div
    className="flex items-center gap-3 text-sm text-gray-600"
    style={{ height: 20 }}
  >
    <span className="font-medium text-gray-900">Overview</span>
    <Separator orientation="vertical" />
    <span>Daily usage</span>
    <Separator orientation="vertical" />
    <span>Conversations</span>
  </div>
);
