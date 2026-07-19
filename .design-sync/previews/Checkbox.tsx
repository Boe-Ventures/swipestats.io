import { Checkbox } from "swipestats";

export const Default = () => (
  <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
    <Checkbox defaultChecked /> Email me a reminder
  </label>
);

export const States = () => (
  <div className="flex items-center gap-5">
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Checkbox /> Unchecked
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Checkbox defaultChecked /> Checked
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-400">
      <Checkbox disabled /> Disabled
    </label>
  </div>
);

export const ProviderList = () => (
  <div className="flex flex-col gap-3">
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Checkbox defaultChecked /> Tinder
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Checkbox defaultChecked /> Hinge
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Checkbox /> Bumble
    </label>
  </div>
);
