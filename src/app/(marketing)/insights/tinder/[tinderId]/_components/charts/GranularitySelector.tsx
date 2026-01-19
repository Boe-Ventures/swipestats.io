import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeGranularity } from "@/lib/utils/aggregateUsage";

type GranularitySelectorProps = {
  value: TimeGranularity;
  onChange: (value: TimeGranularity) => void;
};

export function GranularitySelector({
  value,
  onChange,
}: GranularitySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]" aria-label="Select granularity">
        <SelectValue placeholder="Select granularity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">Daily</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
        <SelectItem value="monthly">Monthly</SelectItem>
        <SelectItem value="quarterly">Quarterly</SelectItem>
        <SelectItem value="yearly">Yearly</SelectItem>
      </SelectContent>
    </Select>
  );
}
