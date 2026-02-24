import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
}

export function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  disabled = false,
}: ActionCardProps) {
  const content = (
    <Card
      className={`transition-shadow hover:shadow-md ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <CardContent className="flex flex-col items-start gap-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        {disabled && <span className="text-xs text-gray-500">Coming soon</span>}
      </CardContent>
    </Card>
  );

  if (disabled) return content;

  return <Link href={href}>{content}</Link>;
}
