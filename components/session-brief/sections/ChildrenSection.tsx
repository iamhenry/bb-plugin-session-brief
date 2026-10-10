import { useEffect, useState } from "react";
import type { ChildThread } from "../../../contract";
import {
  CHILD_STATUS_LABEL,
  formatElapsed,
} from "../../../lib/format";
import { cn } from "../../../lib/utils";
import { SectionHeader } from "../SectionHeader";

/** Running, then error/needs-input, then done. Running: newest started first; others: most recently active first. */
export function sortSubthreads(items: readonly ChildThread[]): ChildThread[] {
  const rank = (c: ChildThread) =>
    c.status === "running" ? 0 : c.status === "error" || c.status === "needs_input" ? 1 : 2;
  const key = (c: ChildThread) =>
    c.status === "running" ? c.startedAtMs ?? 0 : c.updatedAtMs ?? c.startedAtMs ?? 0;
  return [...items].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      key(b) - key(a) ||
      a.id.localeCompare(b.id),
  );
}

function rowMeta(child: ChildThread, nowMs: number): string {
  if (child.status !== "running") {
    return CHILD_STATUS_LABEL[child.status];
  }
  return formatElapsed(child.startedAtMs ?? 0, nowMs) ?? "Active";
}

function SubthreadRow({
  child,
  nowMs,
  onOpen,
}: {
  child: ChildThread;
  nowMs: number;
  onOpen?: (threadId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(child.id)}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[11px] leading-4 hover:bg-state-hover"
    >
      <span className="min-w-0 flex-1 truncate text-foreground">
        {child.title}
      </span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          child.status === "running"
            ? "font-medium text-success"
            : "text-muted-foreground",
        )}
      >
        {rowMeta(child, nowMs)}
      </span>
    </button>
  );
}

export function ChildrenSection({
  items,
  onOpenChild,
}: {
  items: readonly ChildThread[];
  onOpenChild?: (threadId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const running = items.some((item) => item.status === "running");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <section className="border-t border-border px-2.5 py-1">
      <SectionHeader
        icon="UserRound"
        title="Subthreads"
        accessory={`${items.filter((i) => i.status === "running").length}/${items.length}`}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {collapsed ? null : (
        <div className="max-h-40 overflow-y-auto pb-1">
          {items.length === 0 ? (
            <p className="px-1 py-1.5 text-[11px] leading-4 text-muted-foreground">
              No subthreads
            </p>
          ) : (
            sortSubthreads(items).map((child) => (
              <SubthreadRow
                key={child.id}
                child={child}
                nowMs={nowMs}
                onOpen={onOpenChild}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
