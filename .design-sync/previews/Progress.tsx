import { Progress } from "swipestats";

export const ParsingExport = () => (
  <div className="flex w-full flex-col gap-2">
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">Parsing your Tinder export…</span>
      <span className="font-medium tabular-nums text-gray-900">62%</span>
    </div>
    <Progress value={62} />
  </div>
);

export const Stages = () => (
  <div className="flex w-full flex-col gap-3">
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">Uploading file</span>
      <Progress value={25} />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">Stripping identifiers</span>
      <Progress value={62} />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">Insights ready</span>
      <Progress value={100} />
    </div>
  </div>
);
