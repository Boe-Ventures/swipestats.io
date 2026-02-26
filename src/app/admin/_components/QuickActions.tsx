import {
  Users,
  Database,
  Activity,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { ActionCard } from "./ActionCard";

export function QuickActions() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Quick Actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={ImageIcon}
          title="Media Review"
          description="Review user photos and media"
          href="/admin/media-review"
        />
        <ActionCard
          icon={MapPin}
          title="Geography Review"
          description="Review profiles by location"
          href="/admin/geography-review"
        />
        <ActionCard
          icon={Users}
          title="User Management"
          description="View and manage user accounts"
          href="/admin/users"
          disabled
        />
        <ActionCard
          icon={Database}
          title="Database Stats"
          description="View database metrics and health"
          href="/admin/database"
          disabled
        />
        <ActionCard
          icon={Activity}
          title="System Monitoring"
          description="Monitor system performance"
          href="/admin/monitoring"
          disabled
        />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Additional admin features coming soon
      </p>
    </div>
  );
}
