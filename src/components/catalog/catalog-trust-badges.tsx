import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/lib/utils";

export function CatalogTrustBadges({
  verified,
  featured,
  editorialPick,
  affiliate,
  className,
}: {
  verified?: boolean;
  featured?: boolean;
  editorialPick?: boolean;
  affiliate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {featured && (
        <Badge className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50">
          Featured
        </Badge>
      )}
      {editorialPick && (
        <Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50">
          Editorial pick
        </Badge>
      )}
      {verified && (
        <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Verified
        </Badge>
      )}
      {affiliate && (
        <Badge
          variant="outline"
          className="border-gray-300 bg-gray-50 text-gray-600"
        >
          Affiliate link
        </Badge>
      )}
    </div>
  );
}
