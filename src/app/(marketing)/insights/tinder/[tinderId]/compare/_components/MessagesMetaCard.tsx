import React from "react";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessagesMetaCardProps {
  title: string;
  icon: LucideIcon;
  stat: React.ReactNode;
  from?: string;
}

export function MessagesMetaCard({
  title,
  icon: Icon,
  stat,
  from,
}: MessagesMetaCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat}</div>
        {from && <p className="text-muted-foreground text-xs">{from}</p>}
      </CardContent>
    </Card>
  );
}
