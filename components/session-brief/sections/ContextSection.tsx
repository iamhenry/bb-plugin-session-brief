import { useState } from "react";
import type { ContextUsage } from "../../../contract";
import { contextPercent, formatPercent } from "../../../lib/format";
import { Meter } from "../Meter";
import { SectionHeader } from "../SectionHeader";

export function ContextSection({ context }: { context: ContextUsage }) {
  const [collapsed, setCollapsed] = useState(false);
  const percent = contextPercent(context);
  const accessory =
    context.modelContextWindow <= 0
      ? "—"
      : `${formatPercent(percent)}${context.estimated ? " est." : ""}`;

  return (
    <section className="px-2.5 pb-2 pt-1">
      <SectionHeader
        icon="Circle"
        title="Context"
        accessory={accessory}
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
