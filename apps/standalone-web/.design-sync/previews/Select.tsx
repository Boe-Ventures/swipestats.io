import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
} from "swipestats";

export const Placeholder = () => (
  <SimpleSelect
    placeholder="Pick a provider"
    options={[
      { value: "tinder", label: "Tinder" },
      { value: "hinge", label: "Hinge" },
      { value: "bumble", label: "Bumble" },
    ]}
  />
);

export const WithValue = () => (
  <Select defaultValue="tinder">
    <SelectTrigger className="w-56">
      <SelectValue placeholder="Pick a provider" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="tinder">Tinder</SelectItem>
      <SelectItem value="hinge">Hinge</SelectItem>
      <SelectItem value="bumble">Bumble</SelectItem>
    </SelectContent>
  </Select>
);

export const Small = () => (
  <SimpleSelect
    size="sm"
    value="week"
    options={[
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
    ]}
    aria-label="Time range"
  />
);

export const Disabled = () => (
  <SimpleSelect
    disabled
    placeholder="Pick a provider"
    options={[
      { value: "tinder", label: "Tinder" },
      { value: "hinge", label: "Hinge" },
    ]}
  />
);
