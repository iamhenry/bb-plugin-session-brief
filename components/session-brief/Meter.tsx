import { clampPercent } from "../../lib/format";
import { cn } from "../../lib/utils";

export function Meter({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const percent = clampPercent(value);
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={cn("h-full rounded-full bg-primary", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
