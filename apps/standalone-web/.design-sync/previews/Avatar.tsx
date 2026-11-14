import { Avatar, AvatarFallback } from "swipestats";

export const Initials = () => (
  <div className="flex items-center gap-3">
    <Avatar>
      <AvatarFallback>KB</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>SS</AvatarFallback>
    </Avatar>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-3">
    <Avatar>
      <AvatarFallback className="text-xs">KB</AvatarFallback>
    </Avatar>
    <Avatar className="h-10 w-10">
      <AvatarFallback>KB</AvatarFallback>
    </Avatar>
    <Avatar className="size-12">
      <AvatarFallback>KB</AvatarFallback>
    </Avatar>
  </div>
);

export const AvatarGroup = () => (
  <div className="flex items-center gap-3">
    <div className="flex -space-x-2">
      {["KB", "SS", "AH", "MJ"].map((initials) => (
        <Avatar key={initials} style={{ boxShadow: "0 0 0 2px #fff" }}>
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ))}
    </div>
    <span className="text-sm text-gray-600">7,000+ profiles compared</span>
  </div>
);
