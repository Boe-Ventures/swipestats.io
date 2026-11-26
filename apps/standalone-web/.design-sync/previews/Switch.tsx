import { Label, Switch } from "swipestats";

export const Default = () => (
  <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
    <Switch defaultChecked /> Share anonymously
  </label>
);

export const States = () => (
  <div className="flex items-center gap-5">
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Switch /> Off
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
      <Switch defaultChecked /> On
    </label>
    <label className="flex items-center gap-2.5 text-[14px] text-gray-400">
      <Switch disabled /> Disabled
    </label>
  </div>
);

export const SettingsRows = () => (
  <div className="flex w-full max-w-sm flex-col gap-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-remind">Email me a reminder</Label>
      <Switch id="sw-remind" defaultChecked />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-anon">Share anonymously</Label>
      <Switch id="sw-anon" defaultChecked />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-public">Public profile</Label>
      <Switch id="sw-public" />
    </div>
  </div>
);
