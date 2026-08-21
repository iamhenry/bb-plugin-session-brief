import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "../../lib/utils";

const TYPE = "text-[11px] leading-4";

export function SectionHeader({
  icon,
  title,
  accessory,
  collapsible = false,
  collapsed = false,
  onToggle,
}: {
  icon?: IconName;
  title: string;
  accessory?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-1">
        {icon ? (
          <Icon name={icon} className="size-3.5 shrink-0" aria-hidden />
        ) : null}
        <span className={cn("truncate font-medium", TYPE)}>{title}</span>
        {collapsible ? (
          <Icon
            name={collapsed ? "ChevronRight" : "ChevronDown"}
            className="size-3 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </span>
      {accessory ? (
        <span
          className={cn(
            "ml-auto min-w-0 shrink truncate text-right text-muted-foreground tabular-nums",
            TYPE,
          )}
        >
          {accessory}
        </span>
      ) : null}
    </>
  );

  if (!collapsible) {
    return (
      <div className={cn("flex h-7 items-center gap-2 px-1", TYPE)}>
        {content}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className={cn(
        "h-7 w-full justify-start gap-2 px-1 text-foreground hover:bg-transparent",
        TYPE,
      )}
    >
      {content}
    </Button>
  );
}
