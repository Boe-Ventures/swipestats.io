import { Badge } from "swipestats";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge>Premium</Badge>
    <Badge variant="secondary">Hinge</Badge>
    <Badge variant="destructive">Parse failed</Badge>
    <Badge variant="outline">Anonymous</Badge>
  </div>
);

export const InContext = () => (
  <div className="flex w-full flex-col gap-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-900">
        Match rate <span className="font-semibold tabular-nums">19.9%</span>
      </span>
      <Badge>Top 10%</Badge>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-900">Tinder · all time</span>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">4,345 matches</Badge>
        <Badge variant="outline">38,608 swipes</Badge>
      </div>
    </div>
  </div>
);
