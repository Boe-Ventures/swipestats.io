import { RadioGroup, RadioGroupItem } from "swipestats";

export const Horizontal = () => (
  <RadioGroup defaultValue="tinder" className="flex gap-5">
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="tinder" /> Tinder
    </label>
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="hinge" /> Hinge
    </label>
  </RadioGroup>
);

export const Vertical = () => (
  <RadioGroup defaultValue="hinge">
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="tinder" /> Tinder
    </label>
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="hinge" /> Hinge
    </label>
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="bumble" /> Bumble
    </label>
  </RadioGroup>
);

export const WithDisabledOption = () => (
  <RadioGroup defaultValue="week">
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="week" /> Weekly digest
    </label>
    <label className="flex items-center gap-2 text-[14px] text-gray-700">
      <RadioGroupItem value="month" /> Monthly digest
    </label>
    <label className="flex items-center gap-2 text-[14px] text-gray-400">
      <RadioGroupItem value="realtime" disabled /> Real-time (coming soon)
    </label>
  </RadioGroup>
);
