"use client";

import { Grid3x3, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MapViewToggleProps {
  view: "list" | "map";
  onViewChange: (view: "list" | "map") => void;
}

export function MapViewToggle({ view, onViewChange }: MapViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Grid3x3 className="h-4 w-4" />
      <Label htmlFor="view-toggle" className="text-sm">
        List
      </Label>
      <Switch
        id="view-toggle"
        checked={view === "map"}
        onCheckedChange={(checked) => onViewChange(checked ? "map" : "list")}
      />
      <Globe className="h-4 w-4" />
      <Label htmlFor="view-toggle" className="text-sm">
        Map
      </Label>
    </div>
  );
}
