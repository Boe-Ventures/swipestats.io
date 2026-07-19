import { Skeleton } from "swipestats";

export const LoadingLines = () => (
  <div className="flex w-full flex-col gap-3">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-5 w-1/2" />
    <Skeleton className="h-24 w-full rounded-xl" />
  </div>
);

export const ProfileCardLoading = () => (
  <div className="flex w-full items-center gap-3">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex flex-1 flex-col gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-5 w-12" />
  </div>
);
