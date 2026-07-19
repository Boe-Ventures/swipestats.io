import { Button, Spinner } from "swipestats";

export const Default = () => <Spinner />;

export const Sizes = () => (
  <div className="flex items-center gap-5">
    <Spinner className="size-4" />
    <Spinner className="size-6" />
    <Spinner className="size-8" />
  </div>
);

export const InButton = () => (
  <Button disabled>
    <Spinner data-icon="inline-start" />
    Crunching your matches…
  </Button>
);

export const WithLabel = () => (
  <div className="flex items-center gap-2.5 text-[14px] text-gray-700">
    <Spinner className="text-rose-600" /> Parsing your Tinder export…
  </div>
);
