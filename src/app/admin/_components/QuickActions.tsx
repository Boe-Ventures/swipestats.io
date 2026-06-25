import {
  Users,
  Database,
  Activity,
  Image as ImageIcon,
  MapPin,
  Globe,
  Palette,
  ClipboardList,
  Columns3,
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
          icon={Columns3}
          title="Profile Compare"
          description="Inspect shared profile comparisons"
          href="/admin/profile-compare"
        />
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
          icon={Palette}
          title="OG Image Preview"
          description="Preview and iterate on OG images"
          href="/admin/og-preview"
        />
        <ActionCard
          icon={Globe}
          title="OG / Meta Audit"
          description="Audit meta tags across all pages"
          href="/admin/og-map"
        />
        <ActionCard
          icon={ClipboardList}
          title="Tracking Plan"
          description="Analytics event catalog & destinations"
          href="/admin/tracking-plan"
        />
        <ActionCard
          icon={Activity}
          title="Analytics Debug"
          description="Fire test events, flip consent, inspect identity"
          href="/admin/analytics"
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
