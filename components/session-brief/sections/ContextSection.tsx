import { useState } from "react";
import type { ContextUsage } from "../../../contract";
import { contextPercent, formatPercent } from "../../../lib/format";
import { Meter } from "../Meter";
import { SectionHeader } from "../SectionHeader";

export function contextHeadline(context: ContextUsage): string {
  if (context.modelContextWindow <= 0) return "—";
  return `${formatPercent(contextPercent(context))}${context.estimated ? " est." : ""}`;
}

export function ContextSection({ context }: { context: ContextUsage }) {
  const [collapsed, setCollapsed] = useState(false);
  const percent = contextPercent(context);

  return (
    <section className="px-2.5 pb-2 pt-1">
      <SectionHeader
        icon="Circle"
        title="Context"
        accessory={contextHeadline(context)}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {!collapsed && context.modelContextWindow > 0 ? (
        <Meter value={percent} className="mt-1" />
      ) : null}
    </section>
  );
}
