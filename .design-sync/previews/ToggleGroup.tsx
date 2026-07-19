import { ToggleGroup, ToggleGroupItem } from "swipestats";

export const Single = () => (
  <ToggleGroup type="single" defaultValue="week">
    <ToggleGroupItem value="day">Day</ToggleGroupItem>
    <ToggleGroupItem value="week">Week</ToggleGroupItem>
    <ToggleGroupItem value="month">Month</ToggleGroupItem>
  </ToggleGroup>
);

export const Outline = () => (
  <ToggleGroup type="single" variant="outline" defaultValue="month">
    <ToggleGroupItem value="day">Day</ToggleGroupItem>
    <ToggleGroupItem value="week">Week</ToggleGroupItem>
    <ToggleGroupItem value="month">Month</ToggleGroupItem>
  </ToggleGroup>
);

export const Multiple = () => (
  <ToggleGroup
    type="multiple"
    variant="outline"
    defaultValue={["tinder", "hinge"]}
  >
    <ToggleGroupItem value="tinder">Tinder</ToggleGroupItem>
    <ToggleGroupItem value="hinge">Hinge</ToggleGroupItem>
    <ToggleGroupItem value="bumble">Bumble</ToggleGroupItem>
  </ToggleGroup>
);
