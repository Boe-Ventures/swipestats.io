import {
  Users,
  Heart,
  UserCircle,
  Image,
  Users2,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GlobalStatsProps {
  stats: {
    totalUsers: number;
    totalTinderProfiles: number;
    totalHingeProfiles: number;
    totalMedia: number;
    totalMatches: number;
    totalMessages: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function GlobalStats({ stats }: GlobalStatsProps) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Global Statistics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Tinder Profiles"
          value={stats.totalTinderProfiles}
          icon={Heart}
        />
        <StatCard
          title="Hinge Profiles"
          value={stats.totalHingeProfiles}
          icon={UserCircle}
        />
        <StatCard
          title="Media"
          value={stats.totalMedia}
          icon={Image}
        />
        <StatCard
          title="Matches"
          value={stats.totalMatches}
          icon={Users2}
        />
        <StatCard
          title="Messages"
          value={stats.totalMessages}
          icon={MessageSquare}
        />
      </div>
    </div>
  );
}
