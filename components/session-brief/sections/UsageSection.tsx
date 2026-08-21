import { useState } from "react";
import type { ProviderUsage, UsageWindow } from "../../../contract";
import {
  formatPercent,
  formatResetAt,
  remainingPercent,
} from "../../../lib/format";
import { SectionHeader } from "../SectionHeader";

function remainingLabel(usedPercent: number): string {
  return `${formatPercent(remainingPercent(usedPercent), 0)} left`;
}

function shortWindowName(label: string): string {
  if (/5h/i.test(label)) return "5h";
  if (/week/i.test(label)) return "Wk";
  return label;
}

function collapsedHeadline(primary: ProviderUsage | undefined): string {
  if (!primary) return "—";
  if (primary.windows.length > 0) {
    return primary.windows
      .map(
        (window) =>
          `${shortWindowName(window.label)} ${remainingLabel(window.usedPercent)}`,
      )
      .join(" · ");
  }
  return primary.message ?? primary.planLabel ?? primary.name;
}

function WindowRow({ window }: { window: UsageWindow }) {
  const reset = formatResetAt(window.resetsAt);
  return (
    <div className="flex items-baseline justify-between gap-2 px-1 py-0.5">
      <span className="min-w-0 truncate text-muted-foreground">
        {window.label}
        {reset ? ` ${reset}` : ""}
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {remainingLabel(window.usedPercent)}
      </span>
    </div>
  );
}

function ProviderRow({ provider }: { provider: ProviderUsage }) {
  return (
    <div className="space-y-0.5 px-1 py-1.5 text-[11px] leading-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium text-foreground">
          {provider.name}
        </span>
      </div>
      {provider.status !== "ok" && provider.message ? (
        <p className="text-muted-foreground">{provider.message}</p>
      ) : null}
      {provider.windows.map((window) => (
        <WindowRow key={window.label} window={window} />
      ))}
      {provider.status === "ok" &&
      provider.planLabel &&
      provider.windows.length === 0 ? (
        <p className="truncate text-muted-foreground">{provider.planLabel}</p>
      ) : null}
    </div>
  );
}

export function UsageSection({
  providers,
}: {
  providers: readonly ProviderUsage[];
}) {
  const [collapsed, setCollapsed] = useState(true);
  const primary = providers[0];
  const visible = providers.filter(
    (provider) => provider.status !== "not_installed",
  );

  return (
    <section className="border-t border-border px-2.5 py-1">
      <SectionHeader
        icon="TimeSchedule"
        title="Usage"
        accessory={collapsedHeadline(primary)}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {collapsed ? null : (
        <div className="pb-1">
          {visible.map((provider) => (
            <ProviderRow key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </section>
  );
}
